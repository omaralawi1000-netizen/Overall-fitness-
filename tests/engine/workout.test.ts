import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Engine } from '../../src/engine/engine';
import { abandonSession, adjustRest, discardSession, elapsedMs, finishSession, openDrafts, pauseSession, restLeftMs, resumeSession, setsOf, skipRest, startSession, tickSet, untickSet, updateAllowed } from '../../src/engine/workout';
import { fresh } from './helpers';

const open: Engine[] = [];
afterEach(() => { open.splice(0).forEach((e) => e.close()); });

async function workout() {
  const f = await fresh();
  open.push(f.e);
  const { id, ops } = startSession({ now: f.c.now(), day: '2026-11-02', name: 'Push', slots: [{ exerciseId: 'bench-press', restSec: 120, sets: [{ planned: { reps: 8, kg: 80 } }, { planned: { reps: 8, kg: 80 } }, { planned: { reps: 8, kg: 80 } }] }] });
  await f.e.commit({ type: 'session.start', label: 'Started Push', ops });
  const s = () => f.e.get<'session'>(id)!;
  const set = (i: number) => setsOf(f.e.allRecords(), id)[0].sets[i];
  const tick = (i: number, kg = 80, reps = 8, tapId?: string) => f.e.commit({ id: tapId, type: 'set.tick', label: `Set ${i + 1}`, ops: tickSet({ session: s(), set: set(i), done: { kg, reps }, now: f.c.now(), restSec: 120 }) });
  return { ...f, id, s, set, tick };
}

describe('workout states', () => {
  it('planned and done stay apart: planned 8 × 80, did 6 × 80', async () => {
    const w = await workout();
    await w.tick(0, 80, 6);
    expect(w.set(0)).toMatchObject({ planned: { reps: 8, kg: 80 }, done: { reps: 6, kg: 80 } });
    expect(w.set(1).done).toBeUndefined();
  });

  it('a double tap on a set logs it once and starts one rest', async () => {
    const w = await workout();
    const a = await w.tick(0);
    w.c.tick(300);
    const b = await w.tick(0);
    expect([a.status, b.status]).toEqual(['saved', 'noop']);
    expect(w.s().rest!.endsAt).toBe(a.action!.at + 120000);
    expect(w.e.actions().filter((x) => x.type === 'set.tick')).toHaveLength(1);
  });

  it('undoing set 1 never touches set 2', async () => {
    const w = await workout();
    const a = await w.tick(0);
    await w.tick(1, 80, 7);
    const u = await w.e.undo(a.action!.id, { skipConflicts: true }); // the rest moved on to set 2: that part is left
    expect(u.status).toBe('saved');
    expect(w.set(0).done).toBeUndefined();
    expect(w.set(1).done).toMatchObject({ reps: 7 });
    expect(w.s().rest!.afterSetId).toBe(w.set(1).id);
  });

  it('pause, resume and finish: every move is in the story; paused time is not workout time', async () => {
    const w = await workout();
    w.c.tick(10 * 60000);
    await w.e.commit({ type: 's', label: 'pause', ops: pauseSession(w.s(), w.c.now()) });
    w.c.tick(5 * 60000);
    expect(elapsedMs(w.s(), w.c.now())).toBe(10 * 60000);
    await w.e.commit({ type: 's', label: 'resume', ops: resumeSession(w.s(), w.c.now()) });
    w.c.tick(20 * 60000);
    await w.e.commit({ type: 's', label: 'finish', ops: finishSession(w.s(), w.c.now()) });
    expect(w.s().state).toBe('finished');
    expect(w.s().events.map((e) => e.type)).toEqual(['start', 'pause', 'resume', 'finish']);
    expect(elapsedMs(w.s(), w.c.now() + 99999)).toBe(30 * 60000);
  });

  it('abandoned keeps what was done; discarded is hidden from drafts and comes back only by Undo', async () => {
    const w = await workout();
    await w.tick(0);
    expect(openDrafts(w.e.allRecords()).map((s) => s.id)).toEqual([w.id]);
    const d = await w.e.commit({ type: 'session.discard', label: 'Discarded Push', ops: discardSession(w.s(), w.c.now()) });
    expect(openDrafts(w.e.allRecords())).toHaveLength(0);
    await w.e.reload(); // a reload never brings it back
    expect(openDrafts(w.e.allRecords())).toHaveLength(0);
    await w.e.undo(d.action!.id);
    expect(w.s().state).toBe('active');
    await w.e.commit({ type: 's', label: 'abandon', ops: abandonSession(w.s(), w.c.now()) });
    expect(w.s().state).toBe('abandoned');
    expect(w.set(0).done).toMatchObject({ reps: 8 });
  });

  it('unticking a set stops the rest it started', async () => {
    const w = await workout();
    await w.tick(0);
    await w.e.commit({ type: 's', label: 'untick', ops: untickSet(w.s(), w.set(0)) });
    expect(w.s().rest).toBeUndefined();
    expect(w.set(0).done).toBeUndefined();
  });
});

describe('the rest timer survives anything', () => {
  it('stores the end time: a reload or a locked phone shows the right number at once', async () => {
    const w = await workout();
    const t0 = w.c.now();
    await w.tick(0);
    w.c.tick(47000);
    await w.e.reload(); // the app was killed and opened again
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(120000 - 47000);
    expect(w.s().rest!.endsAt).toBe(t0 + 120000);
  });

  it('pausing freezes it; resuming carries on from the same number', async () => {
    const w = await workout();
    await w.tick(0);
    w.c.tick(30000);
    await w.e.commit({ type: 's', label: 'pause', ops: pauseSession(w.s(), w.c.now()) });
    w.c.tick(600000);
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(90000);
    await w.e.commit({ type: 's', label: 'resume', ops: resumeSession(w.s(), w.c.now()) });
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(90000);
    w.c.tick(1000);
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(89000);
  });

  it('+15, −15 and Skip move the end; −15 never goes before now', async () => {
    const w = await workout();
    await w.tick(0);
    await w.e.commit({ type: 'r', label: '+15', ops: adjustRest(w.s(), 15, w.c.now()) });
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(135000);
    w.c.tick(130000);
    await w.e.commit({ type: 'r', label: '-15', ops: adjustRest(w.s(), -15, w.c.now()) });
    expect(restLeftMs(w.s().rest, w.c.now())).toBe(0);
    await w.e.commit({ type: 'r', label: 'skip', ops: skipRest(w.s()) });
    expect(w.s().rest).toBeUndefined();
  });

  it('property: the time left only ever goes down as the clock moves (no jumps back)', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 600 }), fc.array(fc.integer({ min: 0, max: 5000 }), { maxLength: 50 }), (sec, steps) => {
      const rest = { startedAt: 0, endsAt: sec * 1000, totalSec: sec };
      let t = 0, last = restLeftMs(rest, 0)!;
      for (const d of steps) { t += d; const now = restLeftMs(rest, t)!; if (now > last) return false; last = now; }
      return true;
    }));
  });
});

describe('app updates', () => {
  it('never during a workout or while a save is pending', async () => {
    const w = await workout();
    expect(updateAllowed({ records: w.e.allRecords(), savesPending: false })).toBe(false);
    await w.e.commit({ type: 's', label: 'finish', ops: finishSession(w.s(), w.c.now()) });
    expect(updateAllowed({ records: w.e.allRecords(), savesPending: false })).toBe(true);
    expect(updateAllowed({ records: w.e.allRecords(), savesPending: true })).toBe(false);
  });
});

