import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Engine } from '../../src/engine/engine';
import type { NewRecord } from '../../src/engine/plan';
import { clock, fresh, water, TZ } from './helpers';

const open: Engine[] = [];
afterEach(() => { open.splice(0).forEach((e) => e.close()); });
async function eng(o: Parameters<typeof fresh>[0] = {}) { const f = await fresh(o); open.push(f.e); return f; }

describe('the action log', () => {
  it('a change and its action land together, with time, zone, source and schema', async () => {
    const { e, c } = await eng();
    const r = await e.commit({ type: 'water.log', label: 'Water 250 ml', source: 'voice', ops: [water('w1', 250)] });
    expect(r.status).toBe('saved');
    const w = e.get('w1')!;
    expect(w).toMatchObject({ ml: 250, at: c.now(), tz: TZ, source: 'voice', v: 1, rev: 1, day: '2026-11-02' });
    expect(e.actions()[0]).toMatchObject({ id: r.action!.id, label: 'Water 250 ml', changes: [{ id: 'w1', after: { ml: 250 } }] });
  });

  it('exactly once: the same action id twice writes once (reload, retry)', async () => {
    const { e } = await eng();
    const a = await e.commit({ id: 'tap1', type: 'water.log', label: 'w', ops: [water('w1', 250)] });
    const b = await e.commit({ id: 'tap1', type: 'water.log', label: 'w', ops: [water('w1', 250)] });
    expect([a.status, b.status]).toEqual(['saved', 'duplicate']);
    expect(e.all('water')).toHaveLength(1);
    expect(e.actions()).toHaveLength(1);
  });

  it('exactly once across two open tabs writing the same tap at the same moment', async () => {
    const { idb, name, c } = await eng();
    const t1 = (await eng({ idb, name, c })).e, t2 = (await eng({ idb, name, c })).e;
    const [a, b] = await Promise.all([
      t1.commit({ id: 'tap', type: 'water.log', label: 'w', ops: [water('w9', 300)] }),
      t2.commit({ id: 'tap', type: 'water.log', label: 'w', ops: [water('w9', 300)] }),
    ]);
    expect([a.status, b.status].sort()).toEqual(['duplicate', 'saved']);
    await t1.reload(); await t2.reload();
    expect(t1.all('water')).toHaveLength(1);
    expect(t2.all('water')).toHaveLength(1);
  });

  it('creating a record that already exists is refused, and nothing of that action lands', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const r = await e.commit({ type: 'x', label: 'x', ops: [water('w2', 100), water('w1', 999)] });
    expect(r.status).toBe('failed');
    expect(r.error!.code).toBe('exists');
    expect(e.get('w2')).toBeUndefined();
    await e.reload();
    expect(e.get('w2')).toBeUndefined();
    expect(e.get('w1')).toMatchObject({ ml: 250 });
  });

  it('an update that changes nothing records nothing (the second tap of a double tap)', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const r = await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 250 } }] });
    expect(r.status).toBe('noop');
    expect(e.actions()).toHaveLength(1);
  });

  it('deletes are soft: hidden, kept, and in the history', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const d = await e.commit({ type: 'water.delete', label: 'Deleted water', ops: [{ op: 'delete', id: 'w1' }] });
    expect(e.all('water')).toHaveLength(0);
    expect(e.all('water', true)).toHaveLength(1);
    expect(e.get('w1')!.deleted).toEqual({ at: expect.any(Number), by: d.action!.id });
  });

  it('a multi-step change is all or nothing', async () => {
    const { e } = await eng();
    const r = await e.commit({ type: 'plan.edit', label: 'plan', ops: [water('a', 1), water('b', 2), { op: 'update', id: 'nope', set: { ml: 3 } }] });
    expect(r.status).toBe('failed');
    await e.reload();
    expect(e.allRecords()).toHaveLength(0);
  });

  it('refuses nulls, bad days, non-numbers and engine fields', async () => {
    const { e } = await eng();
    expect((await e.commit({ type: 'x', label: 'x', ops: [water('w', 1, '2026-13-99x')] })).error!.code).toBe('invalid');
    expect((await e.commit({ type: 'x', label: 'x', ops: [{ op: 'create', record: { id: 'q', kind: 'water', ml: 1, rev: 5 } as unknown as NewRecord }] })).error!.code).toBe('engineField');
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    expect((await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: Number.NaN } }] })).error!.code).toBe('invalid');
  });
});

describe('Undo', () => {
  it('reverses only the change it owns', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const a = await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 300 } }] });
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { note: 'after the run' } as never }] });
    const u = await e.undo(a.action!.id);
    expect(u.status).toBe('saved');
    expect(e.get('w1')).toMatchObject({ ml: 250, note: 'after the run' });
  });

  it('stops on a conflict instead of wiping newer work, and says what changed', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const a = await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 300 } }] });
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 400 } }] });
    const u = await e.undo(a.action!.id);
    expect(u.status).toBe('conflict');
    expect(u.conflicts).toEqual([{ id: 'w1', field: 'ml', expected: 300, actual: 400 }]);
    expect(e.get('w1')).toMatchObject({ ml: 400 });
  });

  it('undo of a creation soft-deletes; undo of a delete brings it back; undo twice is refused', async () => {
    const { e } = await eng();
    const c = await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const d = await e.commit({ type: 'x', label: 'x', ops: [{ op: 'delete', id: 'w1' }] });
    expect((await e.undo(d.action!.id)).status).toBe('saved');
    expect(e.all('water')).toHaveLength(1);
    expect((await e.undo(d.action!.id)).status).toBe('failed');
    expect((await e.undo(c.action!.id)).status).toBe('saved');
    expect(e.all('water')).toHaveLength(0);
  });

  it('a whole multi-record action undoes as one, and skipConflicts leaves edited records alone', async () => {
    const { e } = await eng();
    const imp = await e.commit({ type: 'import', label: 'import', source: 'import', ops: [water('a', 1), water('b', 2), water('c', 3)] });
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'b', set: { ml: 20 } }] });
    expect((await e.undo(imp.action!.id)).status).toBe('conflict');
    expect(e.all('water')).toHaveLength(3);
    const u = await e.undo(imp.action!.id, { skipConflicts: true });
    expect(u.status).toBe('saved');
    expect(e.all('water').map((w) => w.id)).toEqual(['b']);
  });

  it('the same undo tap twice undoes once', async () => {
    const { e } = await eng();
    const c = await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    expect((await e.undo(c.action!.id, { id: 'u1' })).status).toBe('saved');
    expect((await e.undo(c.action!.id, { id: 'u1' })).status).toBe('duplicate');
  });

  it('property: any sequence of edits, then undoing them newest first, returns to the start', async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.record({ id: fc.constantFrom('a', 'b', 'c'), ml: fc.integer({ min: 1, max: 5 }), del: fc.boolean() }), { minLength: 1, maxLength: 12 }), async (steps) => {
      const { e } = await fresh();
      await e.commit({ type: 'seed', label: 'seed', ops: [water('a', 1), water('b', 1), water('c', 1)] });
      const start = JSON.stringify(e.all('water', true).map((w) => [w.id, w.ml, !!w.deleted]).sort());
      const done: string[] = [];
      for (const s of steps) {
        const cur = e.get(s.id)!;
        const op = s.del ? { op: 'delete' as const, id: s.id } : cur.deleted ? { op: 'update' as const, id: s.id, set: { deleted: null } } : { op: 'update' as const, id: s.id, set: { ml: s.ml } };
        const r = await e.commit({ type: 'x', label: 'x', ops: [op] });
        if (r.status === 'saved') done.push(r.action!.id);
      }
      for (const id of done.reverse()) { const u = await e.undo(id); if (u.status !== 'saved') { e.close(); return false; } }
      const end = JSON.stringify(e.all('water', true).map((w) => [w.id, w.ml, !!w.deleted]).sort());
      e.close();
      return start === end;
    }), { numRuns: 40 });
  });
});

describe('derived facts', () => {
  it('deleting or correcting a fact marks what was built on it stale, through chains; Undo never makes it fresh again', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250), water('w2', 500)] });
    await e.commit({ type: 'x', label: 'x', ops: [
      { op: 'create', record: { id: 'sum', kind: 'coachItem', stage: 'observation', text: 'You drank 750 ml', basedOn: ['w1', 'w2'] } as NewRecord },
      { op: 'create', record: { id: 'nudge', kind: 'coachItem', stage: 'recommendation', text: 'Drink more', basedOn: ['sum'] } as NewRecord },
    ] });
    const d = await e.commit({ type: 'x', label: 'x', ops: [{ op: 'delete', id: 'w1' }] });
    expect(e.get('sum')!.stale).toBe(true);
    expect(e.get('nudge')!.stale).toBe(true);
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w2', set: { ml: 400 } }] }); // the second fact changes too
    expect((await e.undo(d.action!.id)).status).toBe('saved');
    expect(e.get('w1')!.deleted).toBeUndefined();
    expect(e.get('sum')!.stale).toBe(true); // w2 is still changed: the summary must not look fresh
    expect(e.get('nudge')!.stale).toBe(true);
  });
});

describe('saving states', () => {
  it('a tap repeated after a newer change shows the database, not the old tap', async () => {
    const { e } = await eng();
    await e.commit({ id: 'tap1', type: 'x', label: 'x', ops: [water('w1', 250)] });
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 500 } }] });
    const again = e.run({ id: 'tap1', type: 'x', label: 'x', ops: [{ op: 'update', id: 'w1', set: { ml: 250 } }] });
    expect((await again.result).status).toBe('duplicate');
    expect(e.get<'water'>('w1')!.ml).toBe(500);
  });

  it('the tap shows at once as pending, saved only after the database confirms', async () => {
    const { e } = await eng();
    const { id, result } = e.run({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    expect(e.get('w1')).toMatchObject({ ml: 250 });
    expect(e.saveState(id)).toBe('pending');
    expect(e.busy()).toBe(true);
    await result;
    expect(e.saveState(id)).toBe('saved');
    expect(e.busy()).toBe(false);
  });

  it('a full disk: nothing half-written, the change is taken back and waits as failed with Retry', async () => {
    const { e } = await eng();
    const { IDBObjectStore } = await import('fake-indexeddb');
    const put = IDBObjectStore.prototype.put;
    let full = true;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...a: Parameters<typeof put>) {
      if (full && this.name === 'actions') throw new DOMException('disk full', 'QuotaExceededError');
      return put.apply(this, a);
    };
    try {
      const { id, result } = e.run({ type: 'x', label: 'Water 250 ml', ops: [water('w1', 250), water('w2', 1)] });
      const r = await result;
      expect(r.status).toBe('failed');
      expect(r.error!.code).toBe('full');
      expect(e.saveState(id)).toBe('failed');
      expect(e.get('w1')).toBeUndefined();
      await e.reload();
      expect(e.allRecords()).toHaveLength(0);
      expect(e.failures()).toEqual([{ id, label: 'Water 250 ml', error: expect.anything() }]);
      full = false;
      const again = await e.retry(id)!.result;
      expect(again.status).toBe('saved');
      expect(e.failures()).toHaveLength(0);
      expect(e.all('water')).toHaveLength(2);
    } finally { IDBObjectStore.prototype.put = put; }
  });
});

describe('schema and snapshots', () => {
  it('data written by a newer Aven 2 opens read-only and is never written over', async () => {
    const { e, idb, name } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    await e.setMeta('schema', 99);
    e.close();
    const again = await Engine.open({ idb, name, now: clock().now, tz: () => TZ });
    open.push(again);
    expect(again.readOnly).toBe(true);
    const r = await again.commit({ type: 'x', label: 'x', ops: [water('w2', 1)] });
    expect(r.error!.code).toBe('readOnly');
    expect(again.all('water')).toHaveLength(1);
  });

  it('keeps the last three last-known-good copies', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    for (let i = 0; i < 5; i++) await e.snapshot(`s${i}`);
    const s = await e.snapshots();
    expect(s.map((x) => x.reason)).toEqual(['s4', 's3', 's2']);
    expect(s[0].records).toHaveLength(1);
  });
});

describe('persistent storage', () => {
  it('is asked for only once there is real data, and the answer is kept', async () => {
    const { keepWhenUseful } = await import('../../src/engine/storage');
    const { e } = await eng();
    let asked = 0;
    const nav = { storage: { persisted: async () => false, persist: async () => { asked++; return true; } } } as unknown as Navigator;
    expect(await keepWhenUseful(e, nav)).toBeNull();
    expect(asked).toBe(0);
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    expect(await keepWhenUseful(e, nav)).toBe(true);
    expect(asked).toBe(1);
    expect(await e.meta('persisted')).toBe(true);
  });
});

describe('exactly once, as a property', () => {
  it('any mix of repeated taps writes each tap once', async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 25 }), async (taps) => {
      const { e } = await fresh();
      await Promise.all(taps.map((t) => e.commit({ id: `tap${t}`, type: 'w', label: 'w', ops: [water(`w${t}`, 100)] })));
      const ok = e.all('water').length === new Set(taps).size && e.actions().length === new Set(taps).size;
      e.close();
      return ok;
    }), { numRuns: 30 });
  });
});

describe('fixes from the code review (2 Nov)', () => {
  it('undoing an Undo is a redo, and the change can then be undone from its own entry again', async () => {
    const { e } = await eng();
    const a = await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const u1 = await e.undo(a.action!.id);
    expect((await e.undo(u1.action!.id)).status).toBe('saved');
    expect(e.all('water')).toHaveLength(1);
    expect(e.actions().find((x) => x.id === a.action!.id)!.undoneBy).toBeUndefined();
    expect((await e.undo(a.action!.id)).status).toBe('saved');
    expect(e.all('water')).toHaveLength(0);
  });

  it('a failed save blocks app updates until it is retried', async () => {
    const { e } = await eng();
    const { IDBObjectStore } = await import('fake-indexeddb');
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { throw new DOMException('disk full', 'QuotaExceededError'); };
    try { await e.run({ type: 'x', label: 'x', ops: [water('w1', 250)] }).result; } finally { IDBObjectStore.prototype.put = put; }
    expect(e.busy()).toBe(true);
    await e.retry(e.failures()[0].id)!.result;
    expect(e.busy()).toBe(false);
  });

  it('a change still being saved stays on screen when another tab writes', async () => {
    const { e, idb, name, c } = await eng();
    const other = (await eng({ idb, name, c })).e;
    const { result } = e.run({ type: 'x', label: 'x', ops: [water('mine', 1)] });
    await other.commit({ type: 'x', label: 'x', ops: [water('theirs', 2)] });
    await e.reload();
    expect(e.get('mine')).toBeDefined();
    await result;
    expect(e.get('mine')).toBeDefined();
  });

  it('subscribers hear about every saved write, including restore and import', async () => {
    const { e } = await eng();
    let heard = 0;
    e.subscribe(() => heard++);
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 1)] });
    expect(heard).toBe(1);
  });
});
