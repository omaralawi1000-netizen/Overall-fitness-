import { describe, expect, it } from 'vitest';
import { buildFacts, renderFacts, sheetNumbers } from '../../src/coach/facts';
import type { AnyRecord } from '../../src/engine/model';

const TZ = 'Europe/Copenhagen';
const NOW = Date.parse('2026-11-03T15:00:00+01:00'); // a Tuesday
const at = (day: string, hh = '12') => Date.parse(`${day}T${hh}:00:00+01:00`);
let n = 0;
const env = (kind: string, day: string, extra: Record<string, unknown>) =>
  ({ id: `${kind}${n++}`, kind, v: 1, at: at(day), tz: TZ, day, source: 'tap', createdAt: 0, updatedAt: 0, rev: 1, stamp: 's', ...extra }) as unknown as AnyRecord;

/** a finished session with one working set per [exercise, kg, reps] */
function session(day: string, sets: [string, number, number][], state = 'finished'): AnyRecord[] {
  const s = env('session', day, { name: 'Pull', state, startedAt: at(day, '17'), events: [], pausedMs: 0 });
  return [s, ...sets.flatMap(([ex, kg, reps], i) => {
    const slot = env('slot', day, { sessionId: s.id, exerciseId: ex, order: i });
    return [slot, env('set', day, { sessionId: s.id, slotId: slot.id, order: 0, type: 'working', done: { kg, reps, at: at(day, '17') } })];
  })];
}

describe('training facts', () => {
  it('an assisted lift is left out: less help is progress, never a drop (Codex, PR #81)', () => {
    const rs = [...session('2026-10-20', [['assisted-pull-up', 40, 8]]), ...session('2026-10-27', [['assisted-pull-up', 30, 8]])];
    expect(buildFacts(rs, { now: NOW, tz: TZ }).training.lifts).toEqual([]);
  });

  it('a stuck lift is counted by code: same best set N sessions in a row, while another lift goes up', () => {
    const rs = [
      ...session('2026-10-13', [['barbell-row', 70, 8], ['bench-press', 80, 6]]),
      ...session('2026-10-20', [['barbell-row', 70, 8], ['bench-press', 82.5, 6]]),
      ...session('2026-10-27', [['barbell-row', 70, 8], ['bench-press', 85, 5]]),
      ...session('2026-11-02', [['barbell-row', 70, 8], ['bench-press', 85, 6]]),
      ...session('2026-11-01', [['barbell-row', 100, 8]], 'discarded'),
    ];
    const s = buildFacts(rs, { now: NOW, tz: TZ });
    const row = s.training.lifts.find((l) => /row/i.test(l.exercise))!;
    expect(row).toMatchObject({ status: 'flat', sameInARow: 4 });
    expect(row.best.map((b) => b.kg)).toEqual([70, 70, 70, 70]);
    expect(s.training.lifts.find((l) => /bench/i.test(l.exercise))!.status).toBe('up');
    expect(s.training.weeks).toEqual([1, 1, 1, 1]);
    expect(renderFacts(s)).toMatch(/row[^\n]*70×8[^\n]*flat; same best set 4 sessions in a row/i);
    expect(sheetNumbers(s)).toContain(4);
  });

  it("today's plan and the next week come from the weekly plan, overrides and cleared days", () => {
    const rs = [
      env('routine', '2026-10-01', { name: 'Full body A', items: [] }),
      env('routine', '2026-10-01', { name: 'Full body B', items: [] }),
    ];
    const [a, b] = rs;
    rs.push(env('plan', '2026-10-01', { mode: 'weekly', weekly: { 2: a.id, 4: b.id }, rotation: { order: [], pointer: 0, perWeek: 0 }, overrides: [{ date: '2026-11-08', routineId: a.id }], cleared: ['2026-11-05'], activities: { 1: ['wrestling'], 3: ['wrestling'] } }));
    const s = buildFacts(rs, { now: NOW, tz: TZ });
    expect(s.training.plan.today).toBe('Full body A');
    expect(s.training.plan.next).toEqual([{ day: '2026-11-08 (Sunday)', routine: 'Full body A' }, { day: '2026-11-10 (Tuesday)', routine: 'Full body A' }]);
    expect(s.training.plan.sportDays).toEqual({ Monday: ['wrestling'], Wednesday: ['wrestling'] });
    expect(renderFacts(s)).toMatch(/PLAN: today Full body A/);
  });

  it('two sessions on one day keep the order they happened in, whatever the record order (Codex, PR #81)', () => {
    const am = env('session', '2026-11-02', { name: 'AM', state: 'finished', startedAt: at('2026-11-02', '08'), events: [], pausedMs: 0 });
    const pm = env('session', '2026-11-02', { name: 'PM', state: 'finished', startedAt: at('2026-11-02', '18'), events: [], pausedMs: 0 });
    const sets = (s: AnyRecord, kg: number) => { const slot = env('slot', '2026-11-02', { sessionId: s.id, exerciseId: 'bench-press', order: 0 }); return [slot, env('set', '2026-11-02', { sessionId: s.id, slotId: slot.id, order: 0, type: 'working', done: { kg, reps: 8, at: at('2026-11-02', '19') } })]; };
    const rs = [am, ...sets(am, 80), pm, ...sets(pm, 90)];
    for (const order of [rs, [...rs].reverse()]) expect(buildFacts(order, { now: NOW, tz: TZ }).training.lifts[0].status).toBe('up');
  });

  it('sleep: a nap adds to that day, never counts as another short night (Codex, PR #81)', () => {
    const rec = (endDay: string, endHour: string, hours: number) => env('sleep', endDay, { start: at(endDay, endHour) - hours * 36e5, end: at(endDay, endHour) });
    const rs = ['2026-10-31', '2026-11-01', '2026-11-02'].flatMap((d) => [rec(d, '07', 8), rec(d, '15', 1)]);
    expect(buildFacts(rs, { now: NOW, tz: TZ }).training.sleep).toEqual({ nights: 3, avgHours: 9, under6: 0, under6Of: 3 });
  });

  it('sleep: average and short nights over the last week, and nothing from fewer than 3 nights', () => {
    const night = (endDay: string, hours: number) => env('sleep', endDay, { start: at(endDay, '07') - hours * 36e5, end: at(endDay, '07') });
    const s = buildFacts([night('2026-10-30', 7.5), night('2026-10-31', 5.5), night('2026-11-01', 5), night('2026-11-02', 8), night('2026-11-03', 5.8), night('2026-10-20', 4)], { now: NOW, tz: TZ });
    expect(s.training.sleep).toEqual({ nights: 5, avgHours: 6.4, under6: 3, under6Of: 5 });
    expect(buildFacts([night('2026-11-02', 8), night('2026-11-03', 5)], { now: NOW, tz: TZ }).training.sleep).toBeUndefined();
  });
});

describe('maintenance', () => {
  it('is estimated from complete days and the weight trend, labelled as an estimate, with targets for a pace', () => {
    const rs: AnyRecord[] = [env('settings', '2026-10-01', { language: 'da', dayStartHour: 0, weekStart: 1, units: {}, restDefaultSec: 120, targets: { kcal: 3000 } })];
    for (let i = 1; i <= 28; i++) {
      const d = new Date(Date.parse('2026-11-03T00:00:00Z') - i * 864e5).toISOString().slice(0, 10);
      rs.push(env('food', d, { name: 'x', meal: 'lunch', dataSource: 'reference', portion: { amount: 1, unit: 'portion' }, estimated: false, nutrients: { kcal: 2740 } }));
      rs.push({ ...env('dayNote', d, { foodComplete: true }), id: `day:${d}` } as AnyRecord);
      if (i % 2 === 0) rs.push(env('bodyweight', d, { kg: 74.7 }));
    }
    const s = buildFacts(rs, { now: NOW, tz: TZ });
    const f = (id: string) => s.food28.facts.find((x) => x.id === id);
    expect(f('food28.maintenanceKcal')).toMatchObject({ value: 2740, confidence: 'estimate' });
    expect(f('food28.kcalForGain250g')!.value).toBe(3020); // 2,740 + 0.25 × 7,700 / 7, to the nearest 10
    expect(buildFacts(rs.filter((r) => r.kind !== 'bodyweight'), { now: NOW, tz: TZ }).trust.join(' ')).toMatch(/No maintenance estimate yet/);
  });

  it('counts only complete days that have calories, never every day marked complete (Codex, PR #81)', () => {
    const build = (withKcal: number) => {
      const rs: AnyRecord[] = [env('settings', '2026-10-01', { language: 'da', dayStartHour: 0, weekStart: 1, units: {}, restDefaultSec: 120, targets: { kcal: 3000 } })];
      for (let i = 1; i <= 28; i++) {
        const d = new Date(Date.parse('2026-11-03T00:00:00Z') - i * 864e5).toISOString().slice(0, 10);
        rs.push(env('food', d, { name: 'x', meal: 'lunch', dataSource: 'reference', portion: { amount: 1, unit: 'portion' }, estimated: false, nutrients: i <= withKcal ? { kcal: 2740, protein: 150 } : { protein: 150 } }));
        rs.push({ ...env('dayNote', d, { foodComplete: true }), id: `day:${d}` } as AnyRecord);
        if (i % 2 === 0) rs.push(env('bodyweight', d, { kg: 74.7 }));
      }
      return buildFacts(rs, { now: NOW, tz: TZ });
    };
    const few = build(3);
    expect(few.food28.facts.find((x) => x.id === 'food28.kcalAvgComplete')?.note).toMatch(/average of 3 complete days/);
    expect(few.food28.facts.find((x) => x.id === 'food28.maintenanceKcal')).toBeUndefined();
    expect(few.trust.join(' ')).toMatch(/No maintenance estimate yet/);
    // 8 days with calories, 7 of them inside the weigh-ins' weeks (the newest is after the last weigh-in)
    expect(build(8).food28.facts.find((x) => x.id === 'food28.maintenanceKcal')?.note).toMatch(/^from 7 complete days and the weight trend over the same weeks/);
  });

  it('never mixes intake from one fortnight with weight change from another (Codex, PR #81)', () => {
    const rs: AnyRecord[] = [env('settings', '2026-10-01', { language: 'da', dayStartHour: 0, weekStart: 1, units: {}, restDefaultSec: 120, targets: { kcal: 3000 } })];
    for (const d of ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']) {
      rs.push(env('food', d, { name: 'x', meal: 'lunch', dataSource: 'reference', portion: { amount: 1, unit: 'portion' }, estimated: false, nutrients: { kcal: 1800 } }));
      rs.push({ ...env('dayNote', d, { foodComplete: true }), id: `day:${d}` } as AnyRecord);
    }
    for (const d of ['2026-10-14', '2026-10-17', '2026-10-20', '2026-10-23', '2026-10-26', '2026-10-29']) rs.push(env('bodyweight', d, { kg: 74.7 }));
    const s = buildFacts(rs, { now: NOW, tz: TZ });
    expect(s.food28.facts.find((x) => x.id === 'food28.maintenanceKcal')).toBeUndefined();
    expect(s.food28.facts.find((x) => x.id.startsWith('food28.kcalFor'))).toBeUndefined();
    expect(s.trust.join(' ')).toMatch(/No maintenance estimate yet: .* in the same weeks/);
  });
});
