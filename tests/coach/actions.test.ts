import { describe, expect, it } from 'vitest';
import { apply, check, didLines, readProposal, type Proposal } from '../../src/coach/actions';
import type { Settings } from '../../src/engine/model';
import type { NewRecord } from '../../src/engine/plan';
import { fresh, TZ } from '../engine/helpers';

async function withTargets(targets: Record<string, number>) {
  const f = await fresh();
  await f.e.commit({ type: 'setup', label: 'setup', ops: [{ op: 'create', record: { id: 'settings', kind: 'settings', language: 'en', dayStartHour: 0, weekStart: 1, units: { weight: 'kg', distance: 'km', length: 'cm' }, restDefaultSec: 120, targets } as NewRecord }] });
  return f;
}
const ctx = (f: Awaited<ReturnType<typeof fresh>>) => ({ records: f.e.allRecords(), now: f.c.now(), tz: TZ });
const o = (f: Awaited<ReturnType<typeof fresh>>) => ({ now: f.c.now(), tz: TZ });

describe('reading what the AI proposes', () => {
  it('accepts well-formed proposals and never guesses a missing value', () => {
    expect(readProposal({ name: 'set_target', key: 'protein', value: 250 })).toEqual({ name: 'set_target', key: 'protein', value: 250 });
    expect(readProposal({ name: 'set_target', key: 'protein' })).toEqual({ error: 'value is not a number' });
    expect(readProposal({ name: 'set_target', key: 'protein', value: '250' })).toEqual({ error: 'value is not a number' });
    expect(readProposal({ name: 'delete_all_workouts' })).toEqual({ error: 'unknown action delete_all_workouts' });
    expect(readProposal({ name: 'remember', text: 'x', topic: 'about' })).toHaveProperty('error');
    expect(readProposal({ name: 'remember', text: 'exam week', topic: 'life', until: 'friday' })).toHaveProperty('error');
    expect(readProposal(null)).toHaveProperty('error');
  });
});

describe('validate → check → apply → verify → Undo', () => {
  it('a command is applied at once, verified, and shown with Undo (protein 215 → 250)', async () => {
    const f = await withTargets({ protein: 215, kcal: 3000 });
    const c = check({ name: 'set_target', key: 'protein', value: 250 }, 'command', ctx(f));
    expect(c).toMatchObject({ ok: true, preview: false, label: 'protein target 215 → 250 g' });
    if (!c.ok) throw new Error();
    const r = await apply(f.e, c, 'a-coach-1', o(f));
    expect(r).toEqual({ did: { actionId: 'a-coach-1', label: 'protein target 215 → 250 g', undo: true } });
    expect(f.e.get<'settings'>('settings')!.targets).toEqual({ protein: 250, kcal: 3000 });
    expect(didLines('did' in r ? [r.did] : [])).toBe('Did in the app: protein target 215 → 250 g · Undo');

    expect((await f.e.undo('a-coach-1')).status).toBe('saved');
    expect(f.e.get<'settings'>('settings')!.targets).toEqual({ protein: 215, kcal: 3000 });
  });

  it('a Coach suggestion is a preview, not a change', async () => {
    const f = await withTargets({ kcal: 3000 });
    const c = check({ name: 'set_target', key: 'kcal', value: 3080 }, 'proposal', ctx(f));
    expect(c).toMatchObject({ ok: true, preview: true, label: 'kcal target 3,000 → 3,080 kcal' });
    expect(f.e.get<'settings'>('settings')!.targets.kcal).toBe(3000);
  });

  it('hard limits live in code: no kcal target under 1,200, whatever the AI says', async () => {
    const f = await withTargets({ kcal: 2500 });
    for (const value of [900, 1199, 7000]) expect(check({ name: 'set_target', key: 'kcal', value }, 'command', ctx(f)).ok).toBe(false);
    expect(check({ name: 'log_weight', kg: 880 }, 'command', ctx(f)).ok).toBe(false);
    expect(check({ name: 'log_water', ml: 20000 }, 'command', ctx(f)).ok).toBe(false);
  });

  it('a change that changes nothing is not claimed', async () => {
    const f = await withTargets({ kcal: 2500 });
    expect(check({ name: 'set_target', key: 'kcal', value: 2500 }, 'command', ctx(f))).toEqual({ ok: false, reason: 'kcal target is already 2500' });
  });

  it('the same proposal applied twice (a retry) changes things once', async () => {
    const f = await withTargets({});
    const c = check({ name: 'log_water', ml: 500 }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    await apply(f.e, c, 'a-w', o(f));
    await apply(f.e, c, 'a-w', o(f));
    expect(f.e.all('water')).toHaveLength(1);
  });

  it('remember and forget, each with Undo; forgetting a card that is not there fails', async () => {
    const f = await withTargets({});
    const c = check({ name: 'remember', text: 'exam week until Friday', topic: 'life', until: '2026-11-06' }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    const r = await apply(f.e, c, 'a-m', o(f));
    expect(r).toHaveProperty('did');
    const card = f.e.all('memory')[0];
    expect(card).toMatchObject({ text: 'exam week until Friday', validUntil: '2026-11-06', origin: 'said', scope: 'oneOff' });
    expect(check({ name: 'remember', text: 'Exam week until friday', topic: 'life' }, 'command', ctx(f)).ok).toBe(false);

    const g = check({ name: 'forget', memoryId: card.id }, 'command', ctx(f));
    if (!g.ok) throw new Error();
    expect(await apply(f.e, g, 'a-f', o(f))).toHaveProperty('did');
    expect(f.e.all('memory')).toHaveLength(0);
    await f.e.undo('a-f');
    expect(f.e.all('memory')).toHaveLength(1);
    expect(check({ name: 'forget', memoryId: 'nope' }, 'command', ctx(f))).toEqual({ ok: false, reason: 'no such memory' });
  });

  it('a target with no settings yet creates them, and Undo removes them again', async () => {
    const f = await fresh();
    const c = check({ name: 'set_target', key: 'protein', value: 150 }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    expect(c.label).toBe('protein target 150 g');
    expect(await apply(f.e, c, 'a-s', o(f))).toHaveProperty('did');
    expect((f.e.get('settings') as Settings).targets.protein).toBe(150);
  });

  it('two proposals checked together, applied one after the other, keep both changes (Codex, PR #73)', async () => {
    const f = await withTargets({ protein: 215, kcal: 3000 });
    const a = check({ name: 'set_target', key: 'protein', value: 250 }, 'command', ctx(f));
    const b = check({ name: 'set_target', key: 'kcal', value: 3100 }, 'command', ctx(f));
    if (!a.ok || !b.ok) throw new Error();
    expect(await apply(f.e, a, 'a-p', o(f))).toHaveProperty('did');
    expect(await apply(f.e, b, 'a-k', o(f))).toHaveProperty('did');
    expect(f.e.get<'settings'>('settings')!.targets).toEqual({ protein: 250, kcal: 3100 });
  });

  it('a preview applied after the value changed elsewhere is checked again, not written over it', async () => {
    const f = await withTargets({ kcal: 3000 });
    const c = check({ name: 'set_target', key: 'kcal', value: 3080 }, 'proposal', ctx(f));
    if (!c.ok) throw new Error();
    await f.e.commit({ type: 'edit', label: 'edit', ops: [{ op: 'update', id: 'settings', set: { targets: { kcal: 3080 } } }] });
    expect(await apply(f.e, c, 'a-late', o(f))).toEqual({ failed: 'kcal target is already 3080' });
  });

  it('after Undo removed the settings, setting a target again works (Codex, PR #73)', async () => {
    const f = await fresh();
    const c = check({ name: 'set_target', key: 'protein', value: 150 }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    await apply(f.e, c, 'a-s1', o(f));
    expect((await f.e.undo('a-s1')).status).toBe('saved');
    expect(f.e.get('settings')?.deleted).toBeTruthy();
    const again = check({ name: 'set_target', key: 'protein', value: 160 }, 'command', ctx(f));
    if (!again.ok) throw new Error();
    expect(again.label).toBe('protein target 160 g');
    expect(await apply(f.e, again, 'a-s2', o(f))).toHaveProperty('did');
    expect((f.e.get('settings') as Settings).targets.protein).toBe(160);
    expect(f.e.get('settings')?.deleted).toBeFalsy();
  });

  it('applying an undone change again does not redo it', async () => {
    const f = await withTargets({ kcal: 2500 });
    const c = check({ name: 'set_target', key: 'kcal', value: 2600 }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    await apply(f.e, c, 'a-u', o(f));
    await f.e.undo('a-u');
    expect(await apply(f.e, c, 'a-u', o(f))).toEqual({ failed: 'this change was undone' });
    expect(f.e.get<'settings'>('settings')!.targets.kcal).toBe(2500);
  });

  it('nothing is reported as done when the write fails', async () => {
    const f = await withTargets({ kcal: 2500 });
    const c = check({ name: 'set_target', key: 'kcal', value: 2600 }, 'command', ctx(f));
    if (!c.ok) throw new Error();
    f.e.readOnly = true;
    const r = await apply(f.e, c, 'a-ro', o(f));
    expect(r).toHaveProperty('failed');
    expect(f.e.get<'settings'>('settings')!.targets.kcal).toBe(2500);
  });

  it('every proposal kind round-trips through readProposal', () => {
    const all: Proposal[] = [
      { name: 'set_target', key: 'waterMl', value: 2500 },
      { name: 'remember', text: 'no dairy', topic: 'preference' },
      { name: 'forget', memoryId: 'm1' },
      { name: 'log_water', ml: 250 },
      { name: 'log_weight', kg: 82.4 },
    ];
    for (const p of all) expect(readProposal(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
