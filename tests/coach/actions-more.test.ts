import { describe, expect, it } from 'vitest';
import { apply, check, readProposal, type Proposal } from '../../src/coach/actions';
import { routineOn } from '../../src/coach/training-facts';
import type { Plan } from '../../src/engine/model';
import type { NewRecord } from '../../src/engine/plan';
import { fresh, TZ } from '../engine/helpers';

// today in the helper clock is Monday 2 Nov 2026
async function withPlan() {
  const f = await fresh();
  await f.e.commit({ type: 'setup', label: 'setup', ops: [
    { op: 'create', record: { id: 'settings', kind: 'settings', language: 'en', dayStartHour: 0, weekStart: 1, units: { weight: 'kg', distance: 'km', length: 'cm' }, restDefaultSec: 120, targets: {} } as NewRecord },
    { op: 'create', record: { id: 'r-pull', kind: 'routine', name: 'Pull', items: [] } as NewRecord },
    { op: 'create', record: { id: 'r-legs', kind: 'routine', name: 'Legs', items: [] } as NewRecord },
    { op: 'create', record: { id: 'plan', kind: 'plan', mode: 'weekly', weekly: { 2: 'r-pull', 4: 'r-legs' }, rotation: { order: [], pointer: 0, perWeek: 0 }, overrides: [], cleared: [], activities: {} } as NewRecord },
  ] });
  return f;
}
const ctx = (f: Awaited<ReturnType<typeof fresh>>) => ({ records: f.e.allRecords(), now: f.c.now(), tz: TZ });
const run = async (f: Awaited<ReturnType<typeof fresh>>, p: Proposal, id: string) => {
  const c = check(p, 'command', ctx(f));
  if (!c.ok) return c;
  return apply(f.e, c, id, { now: f.c.now(), tz: TZ });
};
const plan = (f: Awaited<ReturnType<typeof fresh>>) => f.e.get('plan') as unknown as Plan;

describe('move_session', () => {
  it('moves one week only, verifies, and Undo puts it back', async () => {
    const f = await withPlan();
    const r = await run(f, { name: 'move_session', from: '2026-11-03', to: '2026-11-06' }, 'a1');
    expect(r).toEqual({ did: { actionId: 'a1', label: 'moved Pull Tue 3 Nov → Fri 6 Nov', undo: true } });
    expect(routineOn(plan(f), '2026-11-03')).toBeNull();
    expect(routineOn(plan(f), '2026-11-06')).toBe('r-pull');
    expect(routineOn(plan(f), '2026-11-10')).toBe('r-pull'); // next week unchanged
    expect((await f.e.undo('a1')).status).toBe('saved');
    expect(routineOn(plan(f), '2026-11-03')).toBe('r-pull');
    expect(routineOn(plan(f), '2026-11-06')).toBeNull();
  });

  it('"no wait, Friday": a moved session moves again, and the day it left gets its own routine back', async () => {
    const f = await withPlan();
    await run(f, { name: 'move_session', from: '2026-11-03', to: '2026-11-05' }, 'a1');
    const r = await run(f, { name: 'move_session', from: '2026-11-05', to: '2026-11-06' }, 'a2');
    expect(r).toMatchObject({ did: { label: 'moved Pull Thu 5 Nov → Fri 6 Nov' } });
    expect(routineOn(plan(f), '2026-11-03')).toBeNull();
    expect(routineOn(plan(f), '2026-11-05')).toBe('r-legs');
    expect(routineOn(plan(f), '2026-11-06')).toBe('r-pull');
  });

  it('names what a move replaces, and refuses past days, empty days and far-off weeks', async () => {
    const f = await withPlan();
    expect(check({ name: 'move_session', from: '2026-11-03', to: '2026-11-05' }, 'command', ctx(f))).toMatchObject({ ok: true, label: 'moved Pull Tue 3 Nov → Thu 5 Nov (instead of Legs)' });
    expect(check({ name: 'move_session', from: '2026-11-01', to: '2026-11-04' }, 'command', ctx(f))).toMatchObject({ ok: false });
    expect(check({ name: 'move_session', from: '2026-11-04', to: '2026-11-06' }, 'command', ctx(f))).toMatchObject({ ok: false, reason: 'nothing is planned on 2026-11-04' });
    expect(check({ name: 'move_session', from: '2026-11-03', to: '2026-12-20' }, 'command', ctx(f))).toMatchObject({ ok: false });
    expect(readProposal({ name: 'move_session', from: 'Thursday', to: '2026-11-06' })).toHaveProperty('error');
  });
});

describe('log_food and fix_food', () => {
  it('logs an estimate as an estimate, and refuses impossible ones', async () => {
    const f = await withPlan();
    const r = await run(f, { name: 'log_food', food: 'eggs', amount: 3, unit: 'piece', kcal: 215, protein: 19 }, 'f1');
    expect(r).toMatchObject({ did: { label: 'logged eggs, 3 pieces (estimate: 215 kcal, 19 g protein)' } });
    const food = f.e.allRecords().find((x) => x.kind === 'food') as unknown as { estimated: boolean; dataSource: string };
    expect(food).toMatchObject({ estimated: true, dataSource: 'estimate' });
    expect(check({ name: 'log_food', food: 'oats', amount: 50, unit: 'g', kcal: 900, protein: 5 }, 'command', ctx(f))).toMatchObject({ ok: false, reason: 'more calories than that weight can hold' });
    expect(check({ name: 'log_food', food: 'shake', amount: 1, unit: 'portion', kcal: 100, protein: 60 }, 'command', ctx(f))).toMatchObject({ ok: false, reason: 'more protein than the calories allow' });
  });

  it('a correction changes only that entry, and code scales its nutrients', async () => {
    const f = await withPlan();
    await run(f, { name: 'log_food', food: 'eggs', amount: 3, unit: 'piece', kcal: 210, protein: 18 }, 'f1');
    await run(f, { name: 'log_food', food: 'oats', amount: 200, unit: 'g', kcal: 740, protein: 26 }, 'f2');
    const eggs = f.e.allRecords().find((x) => x.kind === 'food' && (x as unknown as { name: string }).name === 'eggs')!;
    const r = await run(f, { name: 'fix_food', foodId: eggs.id, amount: 2 }, 'f3');
    expect(r).toMatchObject({ did: { label: 'changed eggs 3 → 2 pieces' } });
    const foods = f.e.allRecords().filter((x) => x.kind === 'food' && !x.deleted) as unknown as { name: string; portion: { amount: number }; nutrients: { kcal: number; protein: number } }[];
    expect(foods.find((x) => x.name === 'eggs')).toMatchObject({ portion: { amount: 2 }, nutrients: { kcal: 140, protein: 12 } });
    expect(foods.find((x) => x.name === 'oats')).toMatchObject({ portion: { amount: 200 }, nutrients: { kcal: 740 } });
    expect(check({ name: 'fix_food', foodId: 'nope', amount: 2 }, 'command', ctx(f))).toMatchObject({ ok: false });
  });
});
