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

  it('sleep: average and short nights over the last week, and nothing from fewer than 3 nights', () => {
    const night = (endDay: string, hours: number) => env('sleep', endDay, { start: at(endDay, '07') - hours * 36e5, end: at(endDay, '07') });
    const s = buildFacts([night('2026-10-30', 7.5), night('2026-10-31', 5.5), night('2026-11-01', 5), night('2026-11-02', 8), night('2026-11-03', 5.8), night('2026-10-20', 4)], { now: NOW, tz: TZ });
    expect(s.training.sleep).toEqual({ nights: 5, avgHours: 6.4, under6: 3, under6Of: 5 });
    expect(buildFacts([night('2026-11-02', 8), night('2026-11-03', 5)], { now: NOW, tz: TZ }).training.sleep).toBeUndefined();
  });
});
