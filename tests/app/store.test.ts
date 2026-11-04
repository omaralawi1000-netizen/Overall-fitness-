import { afterEach, describe, expect, it } from 'vitest';
import type { Engine } from '../../src/engine/engine';
import { setsOf } from '../../src/engine/workout';
import { Saver, openDraft, type Snap } from '../../src/app/store';
import { fresh } from '../engine/helpers';

const open: Engine[] = [];
afterEach(() => { open.splice(0).forEach((e) => e.close()); });

const lifts = (): Snap['lifts'] => [
  { exerciseId: 'bench-press', restSec: 120, sets: [{ kg: 80, reps: 8, done: false }, { kg: 82.5, reps: 8, done: false }, { kg: 82.5, reps: 8, done: false }] },
  { exerciseId: 'overhead-press', restSec: 120, sets: [{ kg: 47.5, reps: 8, done: false }, { kg: 47.5, reps: 8, done: false }] },
];
async function setup() {
  const f = await fresh(); open.push(f.e);
  const saver = new Saver(f.e);
  const snap: Snap = { name: 'Push', lifts: lifts() };
  saver.begin(snap, f.c.now());
  await f.e.commit({ type: 'noop', label: 'flush', ops: [] }).catch(() => {});
  return { ...f, saver, snap };
}
const sets = (e: Engine, id: string) => setsOf(e.allRecords(), id);
const settle = (e: Engine) => new Promise<void>((r) => { const t = setInterval(() => { if (!e.busy()) { clearInterval(t); r(); } }, 5); });

describe('saving the workout', () => {
  it('starting writes the session, every lift and every planned set in one action', async () => {
    const { e, saver } = await setup(); await settle(e);
    const s = sets(e, saver.id!);
    expect(s.map((x) => x.sets.length)).toEqual([3, 2]);
    expect(s[0].sets[1].planned).toEqual({ kg: 82.5, reps: 8 });
    expect(e.actions().filter((a) => a.type === 'session.start')).toHaveLength(1);
  });

  it('a logged set is saved with what was really done, and the same state twice changes nothing', async () => {
    const { e, c, saver, snap } = await setup();
    snap.lifts[0].sets[0] = { kg: 80, reps: 6, done: true };
    c.tick(60_000); saver.sync(snap, 'Set 1', c.now()); await settle(e);
    expect(sets(e, saver.id!)[0].sets[0].done).toMatchObject({ kg: 80, reps: 6 });
    const n = e.actions().length;
    saver.sync(snap, 'Set 1', c.now()); await settle(e);
    expect(e.actions().length).toBe(n);
  });

  it('Undo on the screen un-ticks the set in the engine', async () => {
    const { e, saver, snap } = await setup();
    snap.lifts[0].sets[0].done = true; saver.sync(snap); await settle(e);
    snap.lifts[0].sets[0].done = false; saver.sync(snap); await settle(e);
    expect(sets(e, saver.id!)[0].sets[0].done).toBeUndefined();
  });

  it('a trimmed plan removes the sets and lifts that are gone, and keeps the logged ones', async () => {
    const { e, saver, snap } = await setup();
    snap.lifts[0].sets[0].done = true; saver.sync(snap); await settle(e);
    const trimmed: Snap = { name: 'Push', lifts: [{ ...snap.lifts[0], sets: snap.lifts[0].sets.slice(0, 2) }] };
    saver.sync(trimmed); await settle(e);
    const s = sets(e, saver.id!);
    expect(s.map((x) => x.sets.length)).toEqual([2]);
    expect(s[0].sets[0].done).toBeDefined();
  });

  it('finishing marks what was not done as skipped and ends the session', async () => {
    const { e, saver, snap } = await setup(); const id = saver.id!;
    snap.lifts[0].sets[0] = { kg: 80, reps: 8, done: true }; saver.sync(snap);
    saver.finish(snap); await settle(e);
    const s = e.get<'session'>(id)!;
    expect(s.state).toBe('finished');
    expect(sets(e, id)[0].sets[1].skipped).toBe(true);
    expect(sets(e, id)[0].sets[0].skipped).toBeUndefined();
    expect(saver.id).toBeNull();
  });

  it('after the app is closed the open workout comes back with its logged sets', async () => {
    const { e, saver, snap, idb, name, c } = await setup();
    snap.lifts[0].sets[0] = { kg: 80, reps: 8, done: true }; saver.sync(snap); await settle(e);
    e.close(); open.length = 0;
    const { Engine } = await import('../../src/engine/engine');
    const e2 = await Engine.open({ idb, name, now: c.now, tz: () => 'Europe/Copenhagen' }); open.push(e2);
    const d = new Saver(e2).draft(c.now())!;
    expect(d.snap.name).toBe('Push');
    expect(d.snap.lifts[0].sets.map((x) => x.done)).toEqual([true, false, false]);
    expect(openDraft(e2.allRecords())!.session.id).toBe(saver.id);
  });

  it('a workout left open for over 12 hours is put away as unfinished, not resumed', async () => {
    const { e, c, saver } = await setup(); await settle(e);
    const later = c.now() + 13 * 3600e3;
    expect(new Saver(e).draft(later)).toBeNull();
    await settle(e);
    expect(e.get<'session'>(saver.id!)!.state).toBe('abandoned');
  });

  it('a tapped food is saved, comes back after a reload, and Undo removes exactly it', async () => {
    const { e, saver, c } = await setup();
    saver.addFood({ id: 'fdA', name: '3 eggs', p: 19, k: 215, c: 1, f: 15 }, c.now());
    saver.addFood({ id: 'fdB', name: 'Skyr 200 g', p: 20, k: 130, c: 8, f: 0 }, c.now() + 1000);
    await settle(e);
    expect(saver.foods(c.now()).map((x) => [x.name, x.p, x.k])).toEqual([['3 eggs', 19, 215], ['Skyr 200 g', 20, 130]]);
    saver.removeFood('fdB'); await settle(e);
    expect(saver.foods(c.now()).map((x) => x.id)).toEqual(['fdA']);
    expect(saver.foods(c.now() + 36 * 3600e3)).toEqual([]); // another day shows nothing
  });
});
