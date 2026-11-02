/**
 * Workouts as actions: start, pause, resume, tick a set, rest, finish, abandon, discard, delete. Each function returns the
 * operations for one action (engine.run / engine.commit write them), so every step is in the history and has Undo.
 *
 * Timers store end times, never a countdown (DATA-MODEL.md §5): the screen shows `endsAt − now`, so a reload or a locked
 * phone resumes at the right number and the first frame never jumps.
 */
import type { AnyRecord, Rest, Session, SessionState, SetDone, SetPlan, Slot, WorkSet } from './model';
import type { NewRecord, Op } from './plan';
import { deepEqual, newId } from './util';

const ev = (s: Session, type: Session['events'][number]['type'], at: number) => [...s.events, { type, at }];

/** A new workout (started now unless `planned`). Slots and sets from a plan are created in the same action. */
export function startSession(o: { now: number; day: string; name: string; routineId?: string; id?: string; planned?: boolean;
  slots?: { exerciseId: string; sets: { type?: 'warmup' | 'working'; planned?: SetPlan }[]; restSec?: number }[] }): { id: string; ops: Op[] } {
  const id = o.id ?? newId('s');
  const state: SessionState = o.planned ? 'planned' : 'active';
  const session = { id, kind: 'session', day: o.day, name: o.name, state, events: [{ type: o.planned ? 'plan' : 'start', at: o.now }],
    pausedMs: 0, ...(o.planned ? { plannedDay: o.day } : { startedAt: o.now }), ...(o.routineId ? { routineId: o.routineId } : {}) } as NewRecord;
  const ops: Op[] = [{ op: 'create', record: session }];
  (o.slots ?? []).forEach((sl, i) => {
    const slotId = `${id}.x${i}`;
    ops.push({ op: 'create', record: { id: slotId, kind: 'slot', day: o.day, sessionId: id, exerciseId: sl.exerciseId, order: i, ...(sl.restSec ? { restSec: sl.restSec } : {}) } as NewRecord });
    sl.sets.forEach((st, j) => ops.push({ op: 'create', record: { id: `${slotId}.s${j}`, kind: 'set', day: o.day, sessionId: id, slotId, order: j, type: st.type ?? 'working', ...(st.planned ? { planned: st.planned } : {}) } as NewRecord }));
  });
  return { id, ops };
}

/** A planned workout begins. */
export function beginPlanned(s: Session, now: number): Op[] {
  if (s.state !== 'planned') return [];
  return [{ op: 'update', id: s.id, set: { state: 'active', startedAt: now, events: ev(s, 'start', now) } }];
}

export function pauseSession(s: Session, now: number): Op[] {
  if (s.state !== 'active') return [];
  const set: Record<string, unknown> = { state: 'paused', pausedAt: now, events: ev(s, 'pause', now) };
  if (s.rest) set.rest = { ...s.rest, pausedLeftMs: Math.max(0, s.rest.endsAt - now) };
  return [{ op: 'update', id: s.id, set }];
}

export function resumeSession(s: Session, now: number): Op[] {
  if (s.state !== 'paused') return [];
  const set: Record<string, unknown> = { state: 'active', pausedAt: null, pausedMs: s.pausedMs + Math.max(0, now - (s.pausedAt ?? now)), events: ev(s, 'resume', now) };
  if (s.rest) {
    const { pausedLeftMs, ...rest } = s.rest;
    set.rest = { ...rest, endsAt: now + (pausedLeftMs ?? Math.max(0, s.rest.endsAt - (s.pausedAt ?? now))) };
  }
  return [{ op: 'update', id: s.id, set }];
}

/** End states. A rest still running ends with it. Paused time up to now is counted. */
function end(s: Session, state: 'finished' | 'abandoned' | 'discarded', type: 'finish' | 'abandon' | 'discard', now: number): Op[] {
  if (s.state === 'finished' || s.state === 'abandoned' || s.state === 'discarded') return [];
  const pausedMs = s.pausedMs + (s.state === 'paused' && s.pausedAt ? Math.max(0, now - s.pausedAt) : 0);
  return [{ op: 'update', id: s.id, set: { state, endedAt: now, pausedMs, pausedAt: null, rest: null, events: ev(s, type, now) } }];
}
export const finishSession = (s: Session, now: number) => end(s, 'finished', 'finish', now);
/** Left unfinished: what was done stays as history. */
export const abandonSession = (s: Session, now: number) => end(s, 'abandoned', 'abandon', now);
/** Thrown away: hidden and never offered back; only Undo of this action brings it back. */
export const discardSession = (s: Session, now: number) => end(s, 'discarded', 'discard', now);

/**
 * Tick a set: what was done, and the rest that follows it. Setting fields (never adding) makes a second tick of the same
 * set change nothing, so a double tap logs it once.
 */
export function tickSet(o: { session: Session; set: WorkSet; done: Omit<SetDone, 'at'>; now: number; restSec?: number }): Op[] {
  const done: SetDone = { ...o.done, at: o.set.done?.at ?? o.now };
  for (const k of Object.keys(done) as (keyof SetDone)[]) if (done[k] === undefined) delete done[k];
  const same = !!o.set.done && deepEqual({ ...o.set.done, at: 0 }, { ...done, at: 0 });
  const ops: Op[] = [{ op: 'update', id: o.set.id, set: { done, skipped: null } }];
  if (!same && o.restSec && o.restSec > 0 && o.session.state === 'active') {
    ops.push({ op: 'update', id: o.session.id, set: { rest: { startedAt: o.now, endsAt: o.now + o.restSec * 1000, totalSec: o.restSec, afterSetId: o.set.id } } });
  }
  return ops;
}

/** Untick: the set is not done any more; a rest it started stops. */
export function untickSet(session: Session, set: WorkSet): Op[] {
  const ops: Op[] = [{ op: 'update', id: set.id, set: { done: null } }];
  if (session.rest?.afterSetId === set.id) ops.push({ op: 'update', id: session.id, set: { rest: null } });
  return ops;
}

export function skipSet(set: WorkSet): Op[] { return [{ op: 'update', id: set.id, set: { skipped: true, done: null } }]; }

/** A set added to a slot (after the last one). */
export function addSet(o: { slot: Slot; sets: WorkSet[]; planned?: SetPlan; type?: 'warmup' | 'working'; id?: string }): Op[] {
  const order = Math.max(-1, ...o.sets.filter((s) => s.slotId === o.slot.id).map((s) => s.order)) + 1;
  return [{ op: 'create', record: { id: o.id ?? newId('t'), kind: 'set', day: o.slot.day, sessionId: o.slot.sessionId, slotId: o.slot.id, order, type: o.type ?? 'working', ...(o.planned ? { planned: o.planned } : {}) } as NewRecord }];
}

// ── the rest timer ───────────────────────────────────────

/** ms of rest left; negative once it has run over. Paused: frozen. */
export function restLeftMs(rest: Rest | undefined, now: number): number | null {
  if (!rest) return null;
  return rest.pausedLeftMs !== undefined ? rest.pausedLeftMs : rest.endsAt - now;
}
/** −15 / +15: the end moves; it never goes before now. */
export function adjustRest(s: Session, deltaSec: number, now: number): Op[] {
  if (!s.rest) return [];
  if (s.rest.pausedLeftMs !== undefined) return [{ op: 'update', id: s.id, set: { rest: { ...s.rest, pausedLeftMs: Math.max(0, s.rest.pausedLeftMs + deltaSec * 1000) } } }];
  return [{ op: 'update', id: s.id, set: { rest: { ...s.rest, endsAt: Math.max(now, s.rest.endsAt + deltaSec * 1000), totalSec: Math.max(0, s.rest.totalSec + deltaSec) } } }];
}
export function skipRest(s: Session): Op[] { return s.rest ? [{ op: 'update', id: s.id, set: { rest: null } }] : []; }

/** Workout time: elapsed minus paused (ported from old Aven's workout.ts `elapsedMs`). */
export function elapsedMs(s: Session, now: number): number {
  if (s.startedAt === undefined) return 0;
  const end = s.endedAt ?? now;
  const paused = s.pausedMs + (s.pausedAt !== undefined && s.endedAt === undefined ? now - s.pausedAt : 0);
  return Math.max(0, end - s.startedAt - paused);
}

// ── drafts and updates ───────────────────────────────────

/** Workouts still open (active or paused): offered openly on start-up, never resumed or finished silently. */
export function openDrafts(records: AnyRecord[]): Session[] {
  return records.filter((r): r is Session => r.kind === 'session' && !r.deleted && (r.state === 'active' || r.state === 'paused'));
}

/** May a new app version take over now? Never during a workout, and never while a save is pending. */
export function updateAllowed(o: { records: AnyRecord[]; savesPending: boolean }): boolean {
  return !o.savesPending && openDrafts(o.records).length === 0;
}

/** Sets of a session in order (slot order, then set order), deleted ones left out. */
export function setsOf(records: AnyRecord[], sessionId: string): { slot: Slot; sets: WorkSet[] }[] {
  const slots = records.filter((r): r is Slot => r.kind === 'slot' && r.sessionId === sessionId && !r.deleted).sort((a, b) => a.order - b.order);
  const sets = records.filter((r): r is WorkSet => r.kind === 'set' && r.sessionId === sessionId && !r.deleted);
  return slots.map((slot) => ({ slot, sets: sets.filter((s) => s.slotId === slot.id).sort((a, b) => a.order - b.order) }));
}
