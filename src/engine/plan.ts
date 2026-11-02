/**
 * The pure heart of the action log: given the records as they are now, what does an action change, and what would its
 * Undo change? No storage here, so every rule is tested directly (and with property tests). engine.ts runs these inside
 * one database transaction.
 */
import { ENGINE_FIELDS, KINDS, SCHEMA, type AnyRecord, type Change, type Action, type Kind, type Source } from './model';
import { deepEqual } from './util';

/** A record as a caller hands it in: the engine fills version, revision and bookkeeping times. */
type Fresh<R> = R extends AnyRecord ? Omit<R, 'v' | 'rev' | 'createdAt' | 'updatedAt' | 'at' | 'tz' | 'source'> & { at?: number; tz?: string; source?: Source } : never;
export type NewRecord = Fresh<AnyRecord>;

export type Op =
  | { op: 'create'; record: NewRecord }
  /** set fields; `null` removes a field */
  | { op: 'update'; id: string; set: Record<string, unknown> }
  /** soft delete; `ifExists`: a record that isn't there is fine (restore's "replace") */
  | { op: 'delete'; id: string; ifExists?: boolean }
  /**
   * restore and import only: write a whole record as given (checked), keeping its own times; the revision goes up.
   * Decided against the database inside the transaction: `absent` writes only a record that isn't there (import);
   * `newer` also replaces a live one that is older (merge; something deleted here stays deleted); `always` (replace).
   */
  | { op: 'put'; record: AnyRecord; when: 'absent' | 'newer' | 'always' };

export interface Ctx { actionId: string; now: number; tz: string; source: Source }
type Rec = Record<string, unknown> & { id: string; kind: Kind; rev: number };

export class EngineError extends Error {
  constructor(public code: 'exists' | 'missing' | 'deleted' | 'invalid' | 'engineField' | 'readOnly' | 'full' | 'storage' | 'notFound' | 'alreadyUndone', message: string) { super(message); }
}

/** Fields that are bookkeeping, never part of what a change "is" (and never restored by Undo). */
const BOOK = ['rev', 'updatedAt'];

function setFields(rec: Rec, set: Record<string, unknown>, now: number): Rec {
  const out: Rec = { ...rec };
  for (const [k, v] of Object.entries(set)) { if (v === null || v === undefined) delete out[k]; else out[k] = structuredClone(v); }
  out.rev = rec.rev + 1;
  out.updatedAt = now;
  return out;
}

/** Plain checks a record must pass before it is written (also used on restore and import). Returns the problem, or null. */
export function checkRecord(r: unknown): string | null {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'not an object';
  const o = r as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return 'no id';
  if (!KINDS.includes(o.kind as Kind)) return `unknown kind ${String(o.kind)}`;
  for (const k of ['at', 'createdAt', 'updatedAt', 'rev', 'v'] as const) if (typeof o[k] !== 'number' || !Number.isFinite(o[k] as number)) return `${k} is not a number`;
  if (typeof o.tz !== 'string' || !o.tz) return 'no time zone';
  if (o.day !== undefined && !(typeof o.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.day))) return 'bad day';
  for (const [k, v] of Object.entries(o)) if (v === null) return `${k} is null`;
  for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && !Number.isFinite(v)) return `${k} is not a finite number`;
  return null;
}

export interface Planned { changes: Change[]; next: Map<string, Rec> }

/**
 * What these operations change, given the records as they are (`current`, keyed by id; absent = doesn't exist).
 * Throws EngineError when an operation can't apply (the whole action is then refused: all or nothing).
 * An update that changes nothing records nothing, which is what makes a double tap harmless.
 */
export function planOps(ops: Op[], current: Map<string, Rec | undefined>, ctx: Ctx): Planned {
  const next = new Map<string, Rec>();
  const get = (id: string) => (next.has(id) ? next.get(id) : current.get(id));
  const byId = new Map<string, Change>();
  const order: string[] = [];
  const note = (id: string, kind: Kind, before: Record<string, unknown> | undefined, after: Record<string, unknown>) => {
    const prev = byId.get(id);
    if (!prev) { byId.set(id, { id, kind, ...(before ? { before } : {}), after }); order.push(id); return; }
    // the same record touched twice in one action: keep the first "before" and the last "after"
    if (prev.before) for (const k of Object.keys(after)) if (!(k in prev.before)) prev.before[k] = before?.[k] ?? null;
    Object.assign(prev.after, after);
  };

  for (const op of ops) {
    if (op.op === 'put') {
      const r = structuredClone(op.record) as unknown as Rec;
      for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
      const cur = get(r.id);
      if (cur && op.when === 'absent') continue;
      if (cur && op.when === 'newer' && (cur.deleted || !((r.updatedAt as number) > (cur.updatedAt as number)))) continue;
      const rec = { ...r, rev: (cur?.rev ?? 0) + 1 } as Rec;
      const bad = checkRecord(rec);
      if (bad) throw new EngineError('invalid', `${r.id}: ${bad}`);
      if (cur && cur.kind !== rec.kind) throw new EngineError('invalid', `${r.id}: kind changes`);
      const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(rec), ...Object.keys(cur ?? {})])) {
        if (BOOK.includes(k)) continue;
        if (cur && deepEqual(cur[k] ?? null, rec[k] ?? null)) continue;
        if (cur) before[k] = cur[k] === undefined ? null : structuredClone(cur[k]);
        after[k] = rec[k] === undefined ? null : structuredClone(rec[k]);
      }
      if (cur && !Object.keys(after).length) continue;

      next.set(rec.id, rec);
      note(rec.id, rec.kind, cur ? before : undefined, after);
      continue;
    }
    if (op.op === 'create') {
      const r = op.record as Record<string, unknown>;
      for (const f of ENGINE_FIELDS) if (f !== 'id' && f !== 'kind' && r[f] !== undefined) throw new EngineError('engineField', `create sets ${f}`);
      if (typeof r.id !== 'string' || !r.id) throw new EngineError('invalid', 'a new record needs an id');
      if (get(r.id)) throw new EngineError('exists', `${r.id} already exists`);
      const rec = { at: ctx.now, tz: ctx.tz, source: ctx.source, ...structuredClone(r), v: SCHEMA, createdAt: ctx.now, updatedAt: ctx.now, rev: 1 } as unknown as Rec;
      for (const k of Object.keys(rec)) if (rec[k] === undefined) delete rec[k];
      const bad = checkRecord(rec);
      if (bad) throw new EngineError('invalid', `${r.id}: ${bad}`);
      next.set(rec.id, rec);
      const after: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rec)) if (!BOOK.includes(k)) after[k] = structuredClone(v);
      note(rec.id, rec.kind, undefined, after);
      continue;
    }
    const cur = get(op.id);
    if (!cur && op.op === 'delete' && op.ifExists) continue;
    if (!cur) throw new EngineError('missing', `${op.id} doesn't exist`);
    let set: Record<string, unknown>;
    if (op.op === 'delete') {
      if (cur.deleted) continue; // already deleted: nothing to do
      set = { deleted: { at: ctx.now, by: ctx.actionId } };
    } else {
      if (cur.deleted && !('deleted' in op.set)) throw new EngineError('deleted', `${op.id} is deleted`);
      for (const f of [...ENGINE_FIELDS, 'createdAt']) if (f in op.set) throw new EngineError('engineField', `update sets ${f}`);
      set = op.set;
    }
    const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(set)) {
      const nv = v === undefined ? null : v;
      if (deepEqual(cur[k] ?? null, nv)) continue;
      before[k] = cur[k] === undefined ? null : structuredClone(cur[k]);
      after[k] = structuredClone(nv);
    }
    if (!Object.keys(after).length) continue;
    const rec = setFields(cur, after, ctx.now);
    const bad = checkRecord(rec);
    if (bad) throw new EngineError('invalid', `${op.id}: ${bad}`);
    next.set(rec.id, rec);
    note(rec.id, rec.kind, before, after);
  }
  return { changes: order.map((id) => byId.get(id)!), next };
}

/** Records built on any of `changedIds` (their `basedOn` names one), followed through chains; each gets `stale: true`. */
export function planStale(changedIds: string[], live: Iterable<Rec>, ctx: Ctx): Planned {
  const all = [...live].filter((r) => !r.deleted && Array.isArray(r.basedOn));
  const hit = new Set<string>();
  const queue = [...changedIds];
  while (queue.length) {
    const id = queue.shift()!;
    for (const r of all) if (!hit.has(r.id) && (r.basedOn as string[]).includes(id)) { hit.add(r.id); queue.push(r.id); }
  }
  const ops: Op[] = [...hit].map((id) => ({ op: 'update', id, set: { stale: true } }));
  return planOps(ops, new Map(all.map((r) => [r.id, r])), ctx);
}

export interface Conflict { id: string; field: string; expected: unknown; actual: unknown }

/**
 * The Undo of `action`, given the records now. Undo puts back only the fields the action changed, and only if each still
 * holds the value the action left; anything changed since is a conflict. A record the action created is soft-deleted.
 * With `skipConflicts`, records with a conflict are left alone and the rest is undone.
 */
export function planUndo(action: Action, current: Map<string, Rec | undefined>, ctx: Ctx, skipConflicts = false): Planned & { conflicts: Conflict[] } {
  if (action.undoneBy) throw new EngineError('alreadyUndone', 'already undone');
  const conflicts: Conflict[] = [];
  const ops: Op[] = [];
  for (const ch of [...action.changes].reverse()) {
    // A "stale" mark is never taken back: another change may also have made the record stale since, so it stays stale
    // until it is worked out again (a needless recount at worst, never a wrong number shown as fresh).
    if (Object.keys(ch.after).every((k) => k === 'stale')) continue;
    const cur = current.get(ch.id);
    const mine: Conflict[] = [];
    if (!cur) { mine.push({ id: ch.id, field: '*', expected: 'exists', actual: 'missing' }); }
    else {
      // Undoing a creation also stops when a field was added since (a set created empty, then ticked as done).
      const fields = (ch.before ? Object.keys(ch.after) : [...new Set([...Object.keys(ch.after), ...Object.keys(cur), 'deleted'])])
        .filter((k) => !(ENGINE_FIELDS as readonly string[]).includes(k) && k !== 'stale');
      for (const f of fields) if (!deepEqual(cur[f] ?? null, ch.after[f] ?? null)) mine.push({ id: ch.id, field: f, expected: ch.after[f] ?? null, actual: cur[f] ?? null });
    }
    if (mine.length) { conflicts.push(...mine); continue; }
    // engine bookkeeping (version, created time) is never put back by Undo: it describes the record, not the change
    const back = ch.before ? Object.fromEntries(Object.entries(ch.before).filter(([k]) => !(ENGINE_FIELDS as readonly string[]).includes(k))) : null;
    if (back && !Object.keys(back).length) continue;
    ops.push(back ? { op: 'update', id: ch.id, set: back } : { op: 'delete', id: ch.id });
  }
  if (conflicts.length && !skipConflicts) return { changes: [], next: new Map(), conflicts };
  return { ...planOps(ops, current, ctx), conflicts };
}
