/**
 * The engine: Aven 2's data on the phone (IndexedDB `a2.data`), with one action log.
 *
 * - Every change is an action. The records and the action are written in ONE transaction: both land or neither does.
 * - Exactly once: the action id is made at the tap; the same id twice is a no-op (reload, retry, another tab).
 * - Undo reverses only its own change and stops on a conflict (plan.ts).
 * - Deleting or changing a fact marks everything built on it stale, in the same transaction.
 * - The tap is never blocked: `run()` shows the change at once as pending, "saved" only after the database confirms,
 *   "failed" (kept, with Retry) if the write fails.
 *
 * Plain-words rules: docs/engine/DATA-MODEL.md §4–6.
 */
import { SCHEMA, type Action, type AnyRecord, type Kind, type RecordOf, type Source } from './model';
import { EngineError, planOps, planStale, planUndo, type Conflict, type Ctx, type Op } from './plan';
import { deviceTz } from './time';
import { done, newId, req } from './util';
import { MIGRATIONS, migrateRecord } from './migrations';

export const DB_NAME = 'a2.data';
const DB_VERSION = 1;
const CHANNEL = 'a2.data';
/** Last-known-good copies kept. */
const SNAPSHOTS_KEPT = 3;

type Rec = AnyRecord & Record<string, unknown>;

export interface ActionInput { id?: string; type: string; label: string; source?: Source; ops: Op[] }
export type SaveState = 'pending' | 'saved' | 'failed';
export interface Result {
  /** saved: written; noop: nothing to change; duplicate: this action id was already written; conflict: Undo stopped */
  status: 'saved' | 'noop' | 'duplicate' | 'conflict' | 'failed';
  action?: Action;
  conflicts?: Conflict[];
  error?: EngineError;
}
export interface Snapshot { id: string; seq: number; at: number; reason: string; schema: number; records: AnyRecord[] }

export interface OpenOptions {
  name?: string;
  idb?: IDBFactory;
  now?: () => number;
  tz?: () => string;
  /** how many recent actions to keep in memory for the history list */
  historySize?: number;
}

function openDb(idb: IDBFactory, name: string): Promise<IDBDatabase> {
  if (!name.startsWith('a2')) throw new Error('Aven 2 only opens a2 databases');
  return new Promise((res, rej) => {
    const r = idb.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      const recs = db.createObjectStore('records', { keyPath: 'id' });
      recs.createIndex('kind', 'kind');
      recs.createIndex('basedOn', 'basedOn', { multiEntry: true });
      db.createObjectStore('actions', { keyPath: 'id' }).createIndex('at', 'at');
      db.createObjectStore('meta');
      db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('at', 'at');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked by another tab'));
  });
}

function asEngineError(e: unknown): EngineError {
  if (e instanceof EngineError) return e;
  const name = (e as { name?: string })?.name;
  if (name === 'QuotaExceededError') return new EngineError('full', 'The phone is out of space for Aven 2. Export a backup and free some space.');
  return new EngineError('storage', (e as Error)?.message ?? String(e));
}

export class Engine {
  private records = new Map<string, Rec>();
  private history: Action[] = [];
  private states = new Map<string, SaveState>();
  private failed = new Map<string, { input: ActionInput; error: EngineError }>();
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  /** the database was written by a newer Aven 2: read it, never write it */
  readOnly = false;
  /** schema the database was at before this open (for the report after a migration) */
  migratedFrom: number | null = null;

  private constructor(private db: IDBDatabase, private now: () => number, private tz: () => string, private historySize: number) {}

  static async open(o: OpenOptions = {}): Promise<Engine> {
    const idb = o.idb ?? globalThis.indexedDB;
    const db = await openDb(idb, o.name ?? DB_NAME);
    const e = new Engine(db, o.now ?? Date.now, o.tz ?? deviceTz, o.historySize ?? 300);
    db.onversionchange = () => db.close();
    await e.migrate();
    await e.reload();
    if (typeof BroadcastChannel !== 'undefined') {
      e.channel = new BroadcastChannel(`${CHANNEL}:${o.name ?? DB_NAME}`);
      e.channel.onmessage = () => { void e.reload().then(() => e.emit()); };
    }
    return e;
  }

  close() { this.channel?.close(); this.db.close(); }

  // ── reading ─────────────────────────────────────────────

  get<K extends Kind = Kind>(id: string): RecordOf<K> | undefined { return this.records.get(id) as RecordOf<K> | undefined; }
  /** Live records of a kind (deleted ones left out unless asked for). */
  all<K extends Kind>(kind: K, includeDeleted = false): RecordOf<K>[] {
    const out: RecordOf<K>[] = [];
    for (const r of this.records.values()) if (r.kind === kind && (includeDeleted || !r.deleted)) out.push(r as unknown as RecordOf<K>);
    return out;
  }
  allRecords(): AnyRecord[] { return [...this.records.values()]; }
  /** Newest first. */
  actions(): Action[] { return this.history; }
  saveState(actionId: string): SaveState | undefined { return this.states.get(actionId); }
  failures() { return [...this.failed.entries()].map(([id, f]) => ({ id, label: f.input.label, error: f.error })); }
  /** A save is waiting or failed: never say "saved", never apply an app update. */
  busy(): boolean { return [...this.states.values()].some((s) => s === 'pending'); }
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { for (const l of this.listeners) { try { l(); } catch { /* a listener's own problem */ } } }

  /** Everything again from the database (start-up, or another tab wrote). */
  async reload() {
    const tx = this.db.transaction(['records', 'actions'], 'readonly');
    const [recs, acts] = await Promise.all([req(tx.objectStore('records').getAll()), req(tx.objectStore('actions').index('at').getAll())]);
    this.records = new Map((recs as Rec[]).map((r) => [r.id, r]));
    this.history = (acts as Action[]).reverse().slice(0, this.historySize);
  }

  // ── writing ─────────────────────────────────────────────

  private ctx(actionId: string, source: Source): Ctx { return { actionId, now: this.now(), tz: this.tz(), source }; }

  /**
   * Write an action and wait for the database. All or nothing. Returns `duplicate` when this action id was already
   * written (here or in another tab), `noop` when it changes nothing.
   */
  commit(input: ActionInput): Promise<Result> {
    const id = input.id ?? newId('a');
    const run = () => this.write(id, input);
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /**
   * The tap path: the change shows at once (pending), the write happens behind it. Returns the action id at once and the
   * promise of the result. If the write fails, the shown change is taken back and the action waits in `failures()`
   * for Retry; nothing is ever shown as saved before it is.
   */
  run(input: ActionInput): { id: string; result: Promise<Result> } {
    const id = input.id ?? newId('a');
    const full = { ...input, id };
    this.states.set(id, 'pending');
    try {
      const cur = new Map<string, Rec | undefined>();
      for (const op of input.ops) {
        if (op.op === 'create') cur.set((op.record as { id: string }).id, this.records.get((op.record as { id: string }).id));
        else cur.set(op.id, this.records.get(op.id));
      }
      const { next } = planOps(input.ops, cur as Map<string, never>, this.ctx(id, input.source ?? 'tap'));
      for (const [k, r] of next) this.records.set(k, r as unknown as Rec);
    } catch { /* the real write below reports the problem */ }
    this.emit();
    const result = this.commit(full).then(async (r) => {
      if (r.status === 'failed') {
        this.states.set(id, 'failed');
        this.failed.set(id, { input: full, error: r.error! });
        await this.reload();
      } else {
        this.states.set(id, 'saved');
        this.failed.delete(id);
      }
      this.emit();
      return r;
    });
    return { id, result };
  }

  /** Try a failed action again (same id, so it can never land twice). */
  retry(actionId: string): { id: string; result: Promise<Result> } | null {
    const f = this.failed.get(actionId);
    return f ? this.run(f.input) : null;
  }

  private async write(id: string, input: ActionInput): Promise<Result> {
    if (this.readOnly) return { status: 'failed', error: new EngineError('readOnly', 'This data was saved by a newer Aven 2. Update the app first.') };
    const source = input.source ?? 'tap';
    let tx: IDBTransaction;
    try { tx = this.db.transaction(['records', 'actions'], 'readwrite'); } catch (e) { return { status: 'failed', error: asEngineError(e) }; }
    const finished = done(tx);
    const outcome: { r?: Result; written?: Rec[] } = {};
    try {
      const recs = tx.objectStore('records'), acts = tx.objectStore('actions');
      if (await req(acts.get(id))) { outcome.r = { status: 'duplicate' }; }
      else {
        const ctx = this.ctx(id, source);
        const ids = input.ops.map((op) => (op.op === 'create' ? (op.record as { id: string }).id : op.id));
        const cur = new Map<string, Rec | undefined>();
        for (const k of new Set(ids)) cur.set(k, (await req(recs.get(k))) as Rec | undefined);
        const planned = planOps(input.ops, cur as Map<string, never>, ctx);
        if (!planned.changes.length) outcome.r = { status: 'noop' };
        else {
          const stale = await this.staleFor(recs, planned.changes.map((c) => c.id), planned.next as unknown as Map<string, Rec>, ctx);
          const action: Action = { id, at: ctx.now, tz: ctx.tz, source, type: input.type, label: input.label, changes: [...planned.changes, ...stale.changes] };
          const written = [...planned.next.values(), ...stale.next.values()] as unknown as Rec[];
          for (const r of written) recs.put(r);
          acts.put(action);
          outcome.r = { status: 'saved', action };
          outcome.written = written;
        }
      }
    } catch (e) {
      try { tx.abort(); } catch { /* already over */ }
      await finished.catch(() => undefined);
      return { status: 'failed', error: asEngineError(e) };
    }
    try { await finished; } catch (e) { return { status: 'failed', error: asEngineError(e) }; }
    if (outcome.r!.status === 'saved') this.afterWrite(outcome.r!.action!, outcome.written!);
    else if (outcome.r!.status === 'duplicate') await this.reload();
    return outcome.r!;
  }

  /** Records built on the changed ones (read inside the same transaction), marked stale. */
  private async staleFor(recs: IDBObjectStore, changedIds: string[], next: Map<string, Rec>, ctx: Ctx) {
    const found = new Map<string, Rec>();
    const queue = [...changedIds];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const r of (await req(recs.index('basedOn').getAll(id))) as Rec[]) {
        if (!found.has(r.id)) { found.set(r.id, next.get(r.id) ?? r); queue.push(r.id); }
      }
    }
    // a record that is itself part of this action is never marked stale by it
    for (const id of changedIds) found.delete(id);
    return planStale(changedIds, found.values() as Iterable<never>, ctx);
  }

  private afterWrite(action: Action, written: Rec[]) {
    for (const r of written) this.records.set(r.id, r);
    this.history = [action, ...this.history].slice(0, this.historySize);
    this.channel?.postMessage({ action: action.id });
  }

  /**
   * Undo one action. Puts back only what that action changed, and only where nothing newer changed it. On a conflict
   * nothing is written and the conflicts are returned, unless `skipConflicts` (then the rest is undone and the
   * conflicting records are left as they are).
   */
  undo(actionId: string, o: { id?: string; source?: Source; skipConflicts?: boolean } = {}): Promise<Result> {
    const id = o.id ?? newId('u');
    const run = () => this.writeUndo(id, actionId, o.source ?? 'tap', !!o.skipConflicts);
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private async writeUndo(id: string, target: string, source: Source, skip: boolean): Promise<Result> {
    if (this.readOnly) return { status: 'failed', error: new EngineError('readOnly', 'This data was saved by a newer Aven 2.') };
    const tx = this.db.transaction(['records', 'actions'], 'readwrite');
    const finished = done(tx);
    let result: Result;
    try {
      const recs = tx.objectStore('records'), acts = tx.objectStore('actions');
      if (await req(acts.get(id))) result = { status: 'duplicate' };
      else {
        const action = (await req(acts.get(target))) as Action | undefined;
        if (!action) throw new EngineError('notFound', 'There is no such change to undo.');
        const cur = new Map<string, Rec | undefined>();
        for (const ch of action.changes) cur.set(ch.id, (await req(recs.get(ch.id))) as Rec | undefined);
        const ctx = this.ctx(id, source);
        const planned = planUndo(action, cur as Map<string, never>, ctx, skip);
        if (planned.conflicts.length && !skip) result = { status: 'conflict', conflicts: planned.conflicts };
        else if (!planned.changes.length) result = { status: 'noop', conflicts: planned.conflicts };
        else {
          const stale = await this.staleFor(recs, planned.changes.map((c) => c.id), planned.next as unknown as Map<string, Rec>, ctx);
          const undoAction: Action = { id, at: ctx.now, tz: ctx.tz, source, type: 'undo', label: `Undo: ${action.label}`, undoes: target, changes: [...planned.changes, ...stale.changes] };
          for (const r of [...planned.next.values(), ...stale.next.values()]) recs.put(r);
          acts.put(undoAction);
          acts.put({ ...action, undoneBy: id });
          result = { status: 'saved', action: undoAction, conflicts: planned.conflicts };
        }
      }
    } catch (e) {
      try { tx.abort(); } catch { /* already over */ }
      await finished.catch(() => undefined);
      return { status: 'failed', error: asEngineError(e) };
    }
    try { await finished; } catch (e) { return { status: 'failed', error: asEngineError(e) }; }
    await this.reload();
    if (result.status === 'saved') this.channel?.postMessage({ action: id });
    this.emit();
    return result;
  }

  // ── snapshots, migrations, wiping ───────────────────────

  /** A last-known-good copy of everything, kept before anything risky (migration, restore, import). */
  async snapshot(reason: string): Promise<Snapshot> {
    const tx = this.db.transaction(['records', 'snapshots'], 'readwrite');
    const finished = done(tx);
    const records = (await req(tx.objectStore('records').getAll())) as AnyRecord[];
    const store = tx.objectStore('snapshots');
    const old = ((await req(store.getAll())) as Snapshot[]).sort((a, b) => a.seq - b.seq);
    const snap: Snapshot = { id: newId('k'), seq: (old.at(-1)?.seq ?? 0) + 1, at: this.now(), reason, schema: SCHEMA, records };
    store.put(snap);
    for (const s of old.slice(0, Math.max(0, old.length + 1 - SNAPSHOTS_KEPT))) store.delete(s.id);
    await finished;
    return snap;
  }
  async snapshots(): Promise<Snapshot[]> {
    const all = (await req(this.db.transaction('snapshots').objectStore('snapshots').getAll())) as Snapshot[];
    return all.sort((a, b) => b.seq - a.seq);
  }

  /** Run any migrations the stored data needs, after a last-known-good copy. Newer data than this code: read-only. */
  private async migrate() {
    const stored = (await req(this.db.transaction('meta').objectStore('meta').get('schema'))) as number | undefined;
    if (stored === undefined) {
      const tx = this.db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put(SCHEMA, 'schema');
      await done(tx);
      return;
    }
    if (stored > SCHEMA) { this.readOnly = true; return; }
    if (stored === SCHEMA) return;
    this.migratedFrom = stored;
    await this.snapshot(`before migrating from schema ${stored} to ${SCHEMA}`);
    const tx = this.db.transaction(['records', 'meta'], 'readwrite');
    const finished = done(tx);
    const recs = tx.objectStore('records');
    for (const r of (await req(recs.getAll())) as Rec[]) recs.put(migrateRecord(r, stored, MIGRATIONS));
    tx.objectStore('meta').put(SCHEMA, 'schema');
    await finished;
  }

  async meta<T>(key: string): Promise<T | undefined> { return (await req(this.db.transaction('meta').objectStore('meta').get(key))) as T | undefined; }
  async setMeta(key: string, value: unknown) { const tx = this.db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(value, key); await done(tx); }

  /**
   * Write many records as ONE action in one transaction (restore, import). `ops` are planned against the database as it
   * is inside the transaction, so it's all or nothing.
   */
  bulk(input: ActionInput): Promise<Result> { return this.commit(input); }
}

/** Aven 2's "delete everything": only its own databases and `a2` keys. Never anything else on the site. */
export async function deleteEverything(idb: IDBFactory = globalThis.indexedDB, ls: Storage | undefined = globalThis.localStorage, name = DB_NAME): Promise<void> {
  if (!name.startsWith('a2')) throw new Error('Aven 2 only deletes a2 databases');
  await new Promise<void>((res, rej) => { const r = idb.deleteDatabase(name); r.onsuccess = () => res(); r.onerror = () => rej(r.error); r.onblocked = () => res(); });
  if (ls) for (const k of Object.keys(ls)) if (k.startsWith('a2')) ls.removeItem(k);
}
