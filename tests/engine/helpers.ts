import { IDBFactory } from 'fake-indexeddb';
import { Engine } from '../../src/engine/engine';
import type { NewRecord, Op } from '../../src/engine/plan';

export const TZ = 'Europe/Copenhagen';
/** A clock the test moves by hand. */
export function clock(start = Date.parse('2026-11-02T10:00:00+01:00')) {
  let t = start;
  return { now: () => t, tick: (ms: number) => { t += ms; }, set: (v: number) => { t = v; } };
}
let n = 0;
export async function fresh(o: { idb?: IDBFactory; name?: string; c?: ReturnType<typeof clock> } = {}) {
  const idb = o.idb ?? new IDBFactory();
  const c = o.c ?? clock();
  const name = o.name ?? `a2.test${n++}`;
  const e = await Engine.open({ idb, name, now: c.now, tz: () => TZ });
  return { e, idb, c, name };
}
export const water = (id: string, ml: number, day = '2026-11-02'): Op => ({ op: 'create', record: { id, kind: 'water', ml, day } as NewRecord });
