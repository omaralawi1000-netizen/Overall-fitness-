import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { Engine, deleteEverything } from '../../src/engine/engine';
import { betaBoot, oldAvenDeleteEverything, PENDING, PREFIX } from './fixtures/oldAven';
import { TZ, water } from './helpers';

function fakeStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  const s = {
    get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(),
  };
  // Object.keys(localStorage) lists the keys in a browser
  return new Proxy(s, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (_, k) => (m.has(String(k)) ? { value: m.get(String(k)), enumerable: true, configurable: true } : undefined) }) as unknown as Storage;
}
const names = async (idb: IDBFactory) => (await idb.databases()).map((d) => d.name).sort();
async function a2With(idb: IDBFactory) {
  const e = await Engine.open({ idb, tz: () => TZ });
  await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
  e.close();
}
async function a2Count(idb: IDBFactory) { const e = await Engine.open({ idb, tz: () => TZ }); const n = e.all('water').length; e.close(); return n; }
function oldDb(idb: IDBFactory, name: string) { return new Promise<void>((res) => { const r = idb.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore('x'); r.onsuccess = () => { r.result.close(); res(); }; }); }

describe('old Aven and Aven Beta can never touch a2 data', () => {
  it('old Aven’s "Delete everything" leaves a2’s database and keys alone', async () => {
    const idb = new IDBFactory();
    await a2With(idb);
    await oldDb(idb, 'aven-chat'); await oldDb(idb, 'aven-photos');
    const ls = fakeStorage({ 'aven.v1': '{}', 'aven.keys': 'k', 'a2.keys': 'mine', 'a2.ui': 'x' });
    await oldAvenDeleteEverything({ localStorage: ls, indexedDB: idb });
    expect(ls.getItem('aven.v1')).toBeNull();
    expect(ls.getItem('a2.keys')).toBe('mine');
    expect(ls.getItem('a2.ui')).toBe('x');
    expect(await names(idb)).toEqual(['a2.data']);
    expect(await a2Count(idb)).toBe(1);
  });

  it('Aven Beta’s copy reads only aven… keys and writes only beta: keys; inside Beta, a2 is out of reach', async () => {
    const idb = new IDBFactory();
    await a2With(idb);
    const native = fakeStorage({ 'aven.v1': 'REAL', 'a2.keys': 'mine', [PREFIX + PENDING]: '1' });
    const proto = Object.getPrototypeOf(idb);
    const saved = { open: proto.open, deleteDatabase: proto.deleteDatabase, databases: proto.databases };
    try {
      const win = { localStorage: native, indexedDB: idb } as { localStorage: Storage; indexedDB: IDBFactory };
      betaBoot(win, PREFIX, PENDING);
      expect(native.getItem('a2.keys')).toBe('mine');
      expect(native.getItem('beta:a2.keys')).toBeNull();
      expect(native.getItem('beta:aven.v1')).toBe('REAL');
      // Beta's own "delete all data", and a deleteDatabase of our name, both land on beta:-prefixed copies
      Object.keys(win.localStorage).forEach((k) => win.localStorage.removeItem(k));
      win.localStorage.clear();
      await new Promise((res) => { const r = win.indexedDB.deleteDatabase('a2.data'); r.onsuccess = r.onerror = () => res(null); });
      expect(native.getItem('a2.keys')).toBe('mine');
    } finally { Object.assign(proto, saved); }
    expect(await a2Count(idb)).toBe(1);
  });

  it('Aven 2’s own "delete everything" removes only a2 storage', async () => {
    const idb = new IDBFactory();
    await a2With(idb);
    await oldDb(idb, 'aven-chat');
    const ls = fakeStorage({ 'aven.v1': 'REAL', 'a2.keys': 'mine', other: 'o' });
    await deleteEverything(idb, ls);
    expect(await names(idb)).toEqual(['aven-chat']);
    expect(ls.getItem('aven.v1')).toBe('REAL');
    expect(ls.getItem('other')).toBe('o');
    expect(ls.getItem('a2.keys')).toBeNull();
  });

  it('Aven 2 refuses to open or delete a database outside a2', async () => {
    await expect(Engine.open({ idb: new IDBFactory(), name: 'aven-chat' })).rejects.toThrow();
    await expect(deleteEverything(new IDBFactory(), undefined, 'aven.v1')).rejects.toThrow();
  });
});
