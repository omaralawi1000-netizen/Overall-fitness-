import { afterEach, describe, expect, it } from 'vitest';
import { backupName, exportBackup, parseBackup, previewRestore, restore } from '../../src/engine/backup';
import type { Engine } from '../../src/engine/engine';
import { dryRun, mapOld, readOldBackup, readOldLocal, runImport } from '../../src/engine/importOld';
import { setsOf } from '../../src/engine/workout';
import { MIGRATIONS, migrateRecord } from '../../src/engine/migrations';
import { fresh, water, TZ } from './helpers';
import { oldBackupText, oldData } from './fixtures/oldBackup';

const open: Engine[] = [];
afterEach(() => { open.splice(0).forEach((e) => e.close()); });
async function eng(o: Parameters<typeof fresh>[0] = {}) { const f = await fresh(o); open.push(f.e); return f; }

describe('backup and restore', () => {
  it('exports a versioned file with a checksum, and reads it back', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250), water('w2', 500)] });
    const b = await exportBackup(e);
    expect(b).toMatchObject({ app: 'a2-backup', format: 1, schema: 1, counts: { water: 2 } });
    expect(b.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(backupName(new Date('2026-11-02T10:00:00Z'))).toBe('aven2-backup-2026-11-02.json');
    const p = await parseBackup(JSON.stringify(b));
    expect(p.ok).toBe(true);
  });

  it('a damaged, cut-off, edited, wrong or newer file is refused before anything is touched', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('w1', 250)] });
    const text = JSON.stringify(await exportBackup(e));
    expect(await parseBackup(text.slice(0, text.length / 2))).toMatchObject({ ok: false, problem: 'notJson' });
    expect(await parseBackup(text.replace('"ml":250', '"ml":999'))).toMatchObject({ ok: false, problem: 'checksum' });
    expect(await parseBackup('{"hello":1}')).toMatchObject({ ok: false, problem: 'notBackup' });
    expect(await parseBackup(oldBackupText())).toMatchObject({ ok: false, problem: 'oldAven' });
    const newer = JSON.parse(text); newer.schema = 99;
    expect(await parseBackup(JSON.stringify(newer))).toMatchObject({ ok: false, problem: 'newer' });
    expect(e.all('water')).toHaveLength(1);
  });

  it('restore shows a preview first, then merge keeps newer phone edits and phone deletes', async () => {
    const { e, c } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('a', 1), water('b', 2), water('c', 3)] });
    const file = await exportBackup(e);
    c.tick(1000);
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'a', set: { ml: 10 } }, { op: 'delete', id: 'b' }, { op: 'delete', id: 'c' }] });
    await e.commit({ type: 'x', label: 'x', ops: [water('d', 4)] });
    const p = previewRestore(e, file);
    expect(p).toMatchObject({ summary: '3 waters', newHere: 0, newerOnPhone: 1, deletedOnPhone: 2, onlyOnPhone: 1 });
    const r = await restore(e, file, 'merge');
    expect(r.status).toBe('noop'); // nothing in the file is newer than the phone
    expect(e.all('water').map((w) => [w.id, w.ml]).sort()).toEqual([['a', 10], ['d', 4]]);
  });

  it('replace makes the phone match the file, as one action with Undo, after a last-known-good copy', async () => {
    const { e, c } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('a', 1), water('b', 2)] });
    const file = await exportBackup(e);
    c.tick(1000);
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'update', id: 'a', set: { ml: 10 } }, { op: 'delete', id: 'b' }, water('d', 4)] });
    const r = await restore(e, file, 'replace');
    expect(r.status).toBe('saved');
    expect(e.all('water').map((w) => [w.id, w.ml]).sort()).toEqual([['a', 1], ['b', 2]]);
    expect((await e.snapshots())[0].reason).toMatch(/before restoring/);
    expect((await e.undo(r.action!.id)).status).toBe('saved');
    expect(e.all('water').map((w) => [w.id, w.ml]).sort()).toEqual([['a', 10], ['d', 4]]);
  });

  it('restoring into an empty phone brings everything back, the same', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('a', 1)] });
    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'delete', id: 'a' }, water('b', 2)] });
    const file = (await parseBackup(JSON.stringify(await exportBackup(e)))) as { ok: true; backup: Awaited<ReturnType<typeof exportBackup>> };
    const other = (await eng()).e;
    expect((await restore(other, file.backup, 'merge')).status).toBe('saved');
    expect(other.all('water').map((w) => w.id)).toEqual(['b']);
    expect(other.all('water', true)).toHaveLength(2);
  });

  it('a restore that fails half-way leaves the phone exactly as it was', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('keep', 7)] });
    const good = await exportBackup((await eng()).e);
    const file = { ...good, records: [...(await (async () => { const f = await eng(); await f.e.commit({ type: 'x', label: 'x', ops: [water('n1', 1)] }); return f.e.allRecords(); })()),
      { id: 'evil', kind: 'water', v: 1, at: 1, tz: TZ, source: 'tap', createdAt: 1, updatedAt: 1, rev: 1, ml: Number.NaN }] } as typeof good;
    const r = await restore(e, file, 'replace');
    expect(r.status).toBe('failed');
    await e.reload();
    expect(e.all('water').map((w) => w.id)).toEqual(['keep']);
  });
});

describe('migrations', () => {
  it('run in order, and running them twice gives the same record', () => {
    const list = [{ from: 1, to: 2, migrate: (r: Record<string, unknown>) => ({ ...r, ml: (r.ml as number) * 1 }) }, { from: 2, to: 3, migrate: (r: Record<string, unknown>) => ({ ...r, unit: 'ml' }) }];
    const r = { id: 'w', v: 1, ml: 250 };
    const once = migrateRecord(r, 1, list);
    expect(once).toEqual({ id: 'w', v: 3, ml: 250, unit: 'ml' });
    expect(migrateRecord(once, 1, list)).toEqual(once);
    expect(migrateRecord(r, 1, list)).toEqual(once);
    expect(MIGRATIONS).toEqual([]); // schema 1: nothing to migrate yet
  });
});

describe('import from old Aven', () => {
  const now = Date.parse('2026-11-02T12:00:00+01:00');

  it('reads the backup file and the one-tap copy, and refuses the wrong files', () => {
    const r = readOldBackup(oldBackupText());
    expect(r).toMatchObject({ ok: true, photos: 1, chat: 1 });
    expect(readOldBackup('{"app":"a2-backup"}')).toMatchObject({ ok: false });
    expect(readOldBackup(oldBackupText().slice(0, 300))).toMatchObject({ ok: false });
    expect(readOldBackup(JSON.stringify({ app: 'aven', v: 7, data: {} }))).toMatchObject({ ok: false });
    const reads: string[] = [];
    const ls = { getItem: (k: string) => { reads.push(k); return k === 'aven.v1' ? JSON.stringify(oldData()) : null; } };
    expect(readOldLocal(ls)!.sessions).toHaveLength(1);
    expect(reads).toEqual(['aven.v1', 'aven.v1.active']); // read only, and only its own keys
  });

  it('maps workouts with planned vs done, food, body, sport, health, memory, plan and settings', async () => {
    const m = mapOld(oldData(), { now, tz: TZ, photos: 1, chat: 1 });
    const byId = new Map(m.records.map((r) => [r.id, r]));
    expect(byId.get('old:session:ses1')).toMatchObject({ kind: 'session', state: 'finished', day: '2026-10-30', routineId: 'old:routine:r1', source: 'import' });
    expect(byId.get('old:set:ses1:s2')).toMatchObject({ planned: { repMin: 6, repMax: 8, kg: 80 }, done: { kg: 80, reps: 6 } });
    expect(byId.get('old:set:ses1:s3')).toMatchObject({ planned: { kg: 80 } });
    expect((byId.get('old:set:ses1:s3') as { done?: unknown }).done).toBeUndefined(); // unticked is never "done"
    expect(byId.get('old:slot:ses1:x2')).toMatchObject({ exerciseId: 'old:exercise:custom-1' });
    expect(byId.get('old:food:e2')).toMatchObject({ day: '2026-10-30', estimated: true, portion: { amount: 1, unit: 'portion', label: '1 medium' }, grams: 118, nutrients: { kcal: 105 } });
    expect((byId.get('old:food:e2') as { nutrients: Record<string, number> }).nutrients.protein).toBeUndefined(); // unknown stays unknown
    expect(byId.get('old:food:e3')).toMatchObject({ dataSource: 'quick' });
    expect(byId.get('old:activity:a1')).toMatchObject({ type: 'wrestling', rounds: 6, intensity: 3 });
    expect(byId.get('old:activity:a2')).toMatchObject({ type: 'other', name: 'stairs' });
    expect(byId.get('health:2026-10-30')).toMatchObject({ steps: 9120, restHr: 52, sleepMin: 410 });
    expect((byId.get('health:2026-10-31') as { steps?: number }).steps).toBeUndefined(); // a missing watch number is missing
    expect(byId.get('old:memory:mem1')).toMatchObject({ topic: 'health', validUntil: '2026-10-31', exerciseIds: ['bench-press'], origin: 'said' });
    expect(byId.get('old:memory:mem2')).toMatchObject({ topic: 'goal', goal: { metric: 'weight', target: 80 } });
    expect(byId.get('plan')).toMatchObject({ weekly: { 1: 'old:routine:r1' }, activities: { 2: ['wrestling'] } });
    expect(byId.get('settings')).toMatchObject({ language: 'da', dayStartHour: 4, restDefaultSec: 150, targets: { kcal: 2600, protein: 170, waterMl: 2500 } });
    const why = Object.fromEntries(m.skipped.map((s) => [s.what, s.count]));
    expect(why).toMatchObject({ 'workout still running in old Aven': 1, 'custom foods': 1, 'saved meals': 1, 'progress photos': 1, 'Coach chat messages': 1, 'damaged food': 1, 'remembered dictation choices': 1 });
  });

  it('dry run first, then one action; importing again never duplicates; one Undo takes it all back', async () => {
    const { e } = await eng();
    const m = mapOld(oldData(), { now, tz: TZ });
    const report = dryRun(e, m);
    expect(report.toAdd).toBe(m.records.length);
    expect(report.summary).toMatch(/^1 workout, 4 sets, 3 foods, 1 water/);
    expect(e.allRecords()).toHaveLength(0); // the dry run wrote nothing
    const r = await runImport(e, report);
    expect(r.status).toBe('saved');
    const s = e.get<'session'>('old:session:ses1')!;
    expect(setsOf(e.allRecords(), s.id).map((x) => x.sets.length)).toEqual([3, 1]);

    const again = dryRun(e, mapOld(oldData(), { now: now + 1000, tz: TZ }));
    expect(again).toMatchObject({ toAdd: 0, already: m.records.length });
    expect((await runImport(e, again)).status).toBe('noop');

    await e.commit({ type: 'x', label: 'x', ops: [{ op: 'delete', id: 'old:water:w1' }] });
    expect(dryRun(e, mapOld(oldData(), { now, tz: TZ })).deletedHere).toBe(1); // deleted here stays deleted

    const u = await e.undo(r.action!.id, { skipConflicts: true });
    expect(u.status).toBe('saved');
    expect(e.allRecords().filter((x) => !x.deleted)).toHaveLength(0);
  });

  it('a damaged old backup imports what is sound and counts the rest, never guessing', () => {
    const d = oldData() as Record<string, unknown>;
    d.sessions = [{ id: 'x' }, 'nonsense', null];
    d.weights = [{ id: 'bw', date: '2026-10-30', kg: 'heavy', at: 1 }];
    d.memory = 'not a list';
    const m = mapOld(d, { now, tz: TZ });
    const why = Object.fromEntries(m.skipped.map((s) => [s.what, s.count]));
    expect(why['damaged workouts']).toBe(3);
    expect(why['damaged weigh-ins']).toBe(1);
    expect(m.records.some((r) => r.kind === 'memory')).toBe(false);
    expect(m.records.some((r) => r.kind === 'food')).toBe(true);
  });
});

describe('fixes from the code review (2 Nov)', () => {
  it('a merge is decided against the database, so a delete in another tab after the preview still stays deleted', async () => {
    const { e, idb, name, c } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('a', 1)] });
    c.tick(5000);
    const file = await exportBackup(e);
    const newer = { ...file, records: file.records.map((r) => ({ ...r, updatedAt: r.updatedAt + 99999, ml: 5 })) } as typeof file;
    const other = (await eng({ idb, name, c })).e;
    const del = await other.commit({ type: 'x', label: 'x', ops: [{ op: 'delete', id: 'a' }] }); // this tab hasn't heard yet
    expect(del.error?.message ?? del.status).toBe('saved');
    expect((await restore(e, newer, 'merge')).status).toBe('noop');
    await e.reload();
    expect(e.all('water')).toHaveLength(0);
  });

  it('Undo of a replace-restore works even when the file’s records differ in version or creation time', async () => {
    const { e } = await eng();
    await e.commit({ type: 'x', label: 'x', ops: [water('a', 1)] });
    const file = await exportBackup(e);
    const odd = { ...file, records: file.records.map((r) => ({ ...r, createdAt: 5, ml: 9, updatedAt: r.updatedAt + 1 })) } as typeof file;
    const r = await restore(e, odd, 'replace');
    expect(e.get('a')).toMatchObject({ ml: 9 });
    expect((await e.undo(r.action!.id)).status).toBe('saved');
    expect(e.get('a')).toMatchObject({ ml: 1 });
  });

  it('a backup only holds saved changes, never one still being written', async () => {
    const { e } = await eng();
    e.run({ type: 'x', label: 'x', ops: [water('pending', 1)] });
    const b = await exportBackup(e);
    expect(b.records.some((r) => r.id === 'pending')).toBe(false);
  });

  it('records with only a day get noon of that very day, even far east of UTC', () => {
    for (const tz of ['Pacific/Auckland', 'Pacific/Kiritimati', 'Europe/Copenhagen', 'America/Los_Angeles']) {
      const m = mapOld({ measurements: [{ id: 'm', date: '2025-01-10', kind: 'waist', cm: 80 }] }, { now: 0, tz });
      const r = m.records[0];
      expect(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).format(new Date(r.at))).toBe('2025-01-10, 12');
    }
  });
});
