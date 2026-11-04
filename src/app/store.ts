/**
 * Saving the workout (app side of the engine): the screen keeps its own fast state, and this file mirrors it into the
 * engine as real records (session, slots, sets) so a workout survives a closed app, a dead battery or a killed tab.
 *
 * `syncOps` compares a snapshot of the screen with what the engine holds and returns only the difference, so it is safe
 * to call after every change (a set logged, an Undo, a trimmed plan): the same state twice changes nothing.
 * Plain-words rules: docs/engine/DATA-MODEL.md. Engine actions: src/engine/workout.ts.
 */
import { Engine } from '../engine/engine';
import type { Action } from '../engine/model';
import type { Op } from '../engine/plan';
import { dayKeyAt, deviceTz } from '../engine/time';
import { openDrafts, setsOf, startSession, finishSession, abandonSession } from '../engine/workout';
import type { AnyRecord, FoodLog, Session } from '../engine/model';

export interface SnapSet { kg: number; reps: number; done: boolean }
export interface SnapLift { exerciseId: string; restSec: number; sets: SnapSet[] }
/** What the screen holds right now. */
export interface Snap { name: string; lifts: SnapLift[] }

const sid = (id: string, i: number, j?: number) => (j === undefined ? `${id}.x${i}` : `${id}.x${i}.s${j}`);

/** A workout that has just started: the session, its lifts and every planned set, in one action. */
export function beginOps(snap: Snap, now: number, day: string, id?: string) {
  return startSession({ now, day, name: snap.name, id, slots: snap.lifts.map((l) => ({ exerciseId: l.exerciseId, restSec: l.restSec, sets: l.sets.map((s) => ({ planned: { kg: s.kg, reps: s.reps } })) })) });
}

/** The difference between the screen and the engine. Nothing to do → an empty list. */
export function syncOps(records: AnyRecord[], id: string, snap: Snap, now: number): Op[] {
  const have = setsOf(records, id);
  const ops: Op[] = [];
  const day = (records.find((r) => r.id === id) as Session | undefined)?.day;
  snap.lifts.forEach((lift, i) => {
    const slot = have[i]?.slot;
    if (!slot) {
      ops.push({ op: 'create', record: { id: sid(id, i), kind: 'slot', day, sessionId: id, exerciseId: lift.exerciseId, order: i, restSec: lift.restSec } as never });
    }
    lift.sets.forEach((s, j) => {
      const cur = have[i]?.sets[j];
      if (!cur) {
        ops.push({ op: 'create', record: { id: sid(id, i, j), kind: 'set', day, sessionId: id, slotId: sid(id, i), order: j, type: 'working', planned: { kg: s.kg, reps: s.reps }, ...(s.done ? { done: { kg: s.kg, reps: s.reps, at: now } } : {}) } as never });
        return;
      }
      const set: Record<string, unknown> = {};
      if (s.done) {
        if (cur.done?.kg !== s.kg || cur.done?.reps !== s.reps) set.done = { kg: s.kg, reps: s.reps, at: cur.done?.at ?? now };
        if (cur.skipped) set.skipped = null;
      } else {
        if (cur.done) set.done = null;
        if (cur.planned?.kg !== s.kg || cur.planned?.reps !== s.reps) set.planned = { kg: s.kg, reps: s.reps };
      }
      if (Object.keys(set).length) ops.push({ op: 'update', id: cur.id, set });
    });
    // sets the plan no longer has (a trimmed workout) are removed, never left as phantom "not done"
    (have[i]?.sets ?? []).slice(lift.sets.length).forEach((x) => ops.push({ op: 'delete', id: x.id }));
  });
  have.slice(snap.lifts.length).forEach((h) => { h.sets.forEach((x) => ops.push({ op: 'delete', id: x.id })); ops.push({ op: 'delete', id: h.slot.id }); });
  return ops;
}

/** Finished: whatever was not done is marked skipped, and the session ends. */
export function finishOps(records: AnyRecord[], id: string, now: number): Op[] {
  const s = records.find((r) => r.id === id) as Session | undefined;
  if (!s) return [];
  const ops: Op[] = [];
  setsOf(records, id).forEach((h) => h.sets.forEach((x) => { if (!x.done && !x.skipped) ops.push({ op: 'update', id: x.id, set: { skipped: true } }); }));
  return [...ops, ...finishSession(s, now)];
}

/** A workout the engine still holds as open (started and never finished), for resuming after the app was closed. */
export function openDraft(records: AnyRecord[]): { session: Session; snap: Snap } | null {
  const s = openDrafts(records).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
  if (!s) return null;
  const lifts = setsOf(records, s.id).map(({ slot, sets }) => ({
    exerciseId: slot.exerciseId, restSec: slot.restSec ?? 90,
    sets: sets.map((x) => ({ kg: x.done?.kg ?? x.planned?.kg ?? 0, reps: x.done?.reps ?? x.planned?.reps ?? 0, done: !!x.done })),
  }));
  return { session: s, snap: { name: s.name, lifts } };
}

/** One tapped food, as a record (the screen knows grams of protein, carbs, fat and kcal; the engine stores them as nutrients). */
export interface FoodTap { id: string; name: string; p: number; k: number; c: number; f: number }
export function foodOps(t: FoodTap, now: number, day: string): Op[] {
  return [{ op: 'create', record: { id: t.id, kind: 'food', day, at: now, name: t.name, meal: 'other', dataSource: 'quick', portion: { amount: 1, unit: 'portion' }, estimated: false, nutrients: { protein: t.p, kcal: t.k, carbs: t.c, fat: t.f } } as never }];
}
/** Today's foods (oldest first) as the screen shows them. */
export function foodsOfDay(records: AnyRecord[], day: string): (FoodTap & { at: number })[] {
  return records.filter((r): r is FoodLog => r.kind === 'food' && !r.deleted && r.day === day).sort((a, b) => a.at - b.at)
    .map((r) => ({ id: r.id, name: r.name, p: r.nutrients.protein ?? 0, k: r.nutrients.kcal ?? 0, c: r.nutrients.carbs ?? 0, f: r.nutrients.fat ?? 0, at: r.at }));
}

/** The thin layer the screen calls. Every method returns at once: the screen never waits for the database. */
export class Saver {
  id: string | null = null;
  failed = false;
  constructor(readonly engine: Engine, private onFail: () => void = () => {}) {}

  private run(type: string, label: string, ops: Op[], id?: string) {
    if (!ops.length) return;
    const r = this.engine.run({ id, type, label, ops });
    void r.result.then((x) => { if (x.status === 'failed' || x.status === 'conflict') this.fail(); }, () => this.fail());
  }
  private fail() { this.failed = true; this.onFail(); }

  /** The oldest-first open workout, or null. Workouts left open for over 12 hours are put away as unfinished, never resumed. */
  draft(now = Date.now()): { session: Session; snap: Snap } | null {
    const all = this.engine.allRecords();
    for (const s of openDrafts(all)) {
      if (now - (s.startedAt ?? now) > 12 * 3600e3) this.run('session.abandon', `Left ${s.name} unfinished`, abandonSession(s, now));
    }
    const d = openDraft(this.engine.allRecords());
    if (d) this.id = d.session.id;
    return d;
  }
  begin(snap: Snap, now = Date.now()) {
    const { id, ops } = beginOps(snap, now, dayKeyAt(now, deviceTz()));
    this.id = id;
    this.run('session.start', `Started ${snap.name}`, ops);
  }
  sync(snap: Snap, label = 'Workout changed', now = Date.now()) {
    if (!this.id) return;
    this.run('session.sync', label, syncOps(this.engine.allRecords(), this.id, snap, now));
  }
  finish(snap: Snap, now = Date.now()) {
    if (!this.id) return;
    this.sync(snap, 'Sets saved', now);
    this.run('session.finish', `Finished ${snap.name}`, finishOps(this.engine.allRecords(), this.id, now));
    this.id = null;
  }
  /** A fully logged workout whose finish never came: close it in the engine and let go of it. */
  closeDraft(snap: Snap, now = Date.now()) { this.finish(snap, now); this.id = null; }
  addFood(t: FoodTap, now = Date.now()) { this.run('food.add', `Logged ${t.name}`, foodOps(t, now, dayKeyAt(now, deviceTz())), undefined); }
  removeFood(id: string) { this.run('food.remove', 'Removed food', [{ op: 'delete', id, ifExists: true }]); }
  foods(now = Date.now()) { return foodsOfDay(this.engine.allRecords(), dayKeyAt(now, deviceTz())); }
  /** newest actions of the open workout, for tests and the debug page */
  actions(): Action[] { return this.engine.actions(); }
}
