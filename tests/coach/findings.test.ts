import { describe, expect, it } from 'vitest';
import { buildFacts, renderFacts, sheetNumbers, type FactSheet } from '../../src/coach/facts';
import { clashes, dayLoad, nextReps, nextStep, planNotes, type Finding } from '../../src/coach/findings';
import { CASES } from '../../exam/v2/cases';
import { nowOf } from '../../exam/v2/cases';
import { records, TZ } from '../../exam/v2/people';
import { CATCH, TUNING } from '../../exam/yardstick/catch-lists';
import type { AnyRecord } from '../../src/engine/model';

/** the fact sheet a case's person would give the Coach (the same records the exam uses, no model involved) */
const sheetOf = (id: string): FactSheet => {
  const c = CASES.find((x) => x.id === id)!;
  const now = nowOf(c);
  return buildFacts(records(c.person).filter((r) => (r.at ?? 0) <= now) as unknown as AnyRecord[], { now, tz: TZ });
};
const ids = (s: FactSheet) => s.findings.map((f) => f.id);
const find = (s: FactSheet, id: Finding['id']) => s.findings.find((f) => f.id === id);

/** a hand-made sheet: only the parts a finding reads, so a boundary can be tested on its own */
function sheet(over: Partial<FactSheet> = {}, lifts: FactSheet['training']['lifts'] = [], weeks = [3, 3, 3, 3]): FactSheet {
  const base = sheetOf('r04-whats-today');
  return { ...base, findings: [], goals: [], memory: [], weight: {}, food28: { daysLogged: 0, daysComplete: 0, facts: [] }, ...over, training: { ...base.training, lifts, weeks, ...(over.training ?? {}) } } as unknown as FactSheet;
}
const lift = (exercise: string, kg: number, reps: number, sameInARow: number, status: 'up' | 'flat' | 'down' | 'stalled' = 'flat') => ({
  exercise, status, sameInARow,
  best: Array.from({ length: 6 }, (_, i) => ({ day: `2026-10-${10 + i}`, kg, reps })),
});
import { computeFindings } from '../../src/coach/findings';
const run = (s: FactSheet) => computeFindings(s, {});

describe('stalled lifts', () => {
  it('fire at 5 sessions on the same best set, not at 4, and name the next weight and reps', () => {
    expect(run(sheet({}, [lift('Barbell Row', 70, 8, 4)])).map((f) => f.id)).not.toContain('stalled-lifts');
    const f = run(sheet({}, [lift('Barbell Row', 70, 8, 5)])).find((x) => x.id === 'stalled-lifts')!;
    expect(f.text).toContain('Barbell Row 70 kg × 8 for 5 sessions in a row, next 72.5 kg × 6');
    expect(f.numbers).toEqual(expect.arrayContaining([70, 8, 5, 72.5, 6]));
  });
  it('fire at 3 once the reps are at the top of a range (12 or more): add weight', () => {
    expect(run(sheet({}, [lift('Bench Press', 25, 12, 3)])).map((f) => f.id)).toContain('stalled-lifts');
    expect(run(sheet({}, [lift('Bench Press', 25, 11, 3)])).map((f) => f.id)).not.toContain('stalled-lifts');
  });
  it('never push a lift that is going down, and cap the list at three', () => {
    expect(run(sheet({}, [lift('Row', 70, 8, 6, 'down')])).map((f) => f.id)).not.toContain('stalled-lifts');
    const f = run(sheet({}, ['A', 'B', 'C', 'D'].map((n, i) => lift(n, 50, 8, 5 + i))))[0];
    expect(f.text.match(/, next \d/g)).toHaveLength(3);
  });
  it('a heavy squat or deadlift jumps 5 kg, everything else 2.5, and the reps never go up', () => {
    expect(nextStep('Back Squat', 130)).toBe(5);
    expect(nextStep('Back Squat', 60)).toBe(2.5);
    expect(nextStep('Barbell Row', 130)).toBe(2.5);
    expect(nextReps(70, 8, 2.5)).toBe(6);
    expect(nextReps(30, 11, 2.5)).toBe(7);
    expect(nextReps(100, 1, 2.5)).toBe(1);
  });
  it('a current health note is named, so the model never adds weight to a lift it touches', () => {
    const s = sheet({ memory: [{ id: 'm', text: 'Left shoulder sore, press lighter', topic: 'health' }] }, [lift('Overhead Press', 60, 8, 5)]);
    expect(run(s)[0].text).toContain('health note is current');
  });
  it('the sheet no longer calls a stuck lift "up"', () => {
    for (const id of ['p03-want-to-quit', 'p08-missed-both']) {
      expect(renderFacts(sheetOf(id))).not.toMatch(/; up; same best set/);
    }
    expect(renderFacts(sheetOf('p03-want-to-quit'))).toContain('; stalled; same best set 5 sessions in a row');
  });
});

describe('sessions dropping', () => {
  it('fires when the last week is half of the usual or less, not for steady weeks or a one-a-week habit', () => {
    expect(ids(sheetOf('p03-want-to-quit'))).toContain('sessions-dropping');
    expect(run(sheet({}, [], [5, 5, 5, 4])).map((f) => f.id)).not.toContain('sessions-dropping');
    expect(run(sheet({}, [], [1, 1, 1, 0])).map((f) => f.id)).not.toContain('sessions-dropping'); // 1 a week is not a pattern to fall off from
    expect(run(sheet({}, [], [3, 3, 3, 1])).map((f) => f.id)).toContain('sessions-dropping');
    expect(run(sheet({}, [], [3, 3, 3, 2])).map((f) => f.id)).not.toContain('sessions-dropping');
    expect(run(sheet({}, [], [0, 0, 0, 0])).map((f) => f.id)).not.toContain('sessions-dropping');
  });
  it('names the next planned session so the reply can point to it', () => {
    expect(find(sheetOf('p03-want-to-quit'), 'sessions-dropping')!.text).toContain('Next planned: 2026-11-05 (Thursday) Full body B');
    expect(find(sheetOf('p08-missed-both'), 'sessions-dropping')!.text).toContain('2, 2, 2, 0');
  });
});

describe('goal pace', () => {
  it('ahead of pace: the date it reaches the goal and the kcal that still makes the date', () => {
    const f = find(sheetOf('d02-row-stuck'), 'goal-pace')!;
    expect(f.text).toContain('moving -0.5 kg a week and the date needs -0.1 kg a week');
    expect(f.text).toContain('weeks before 2027-02-28');
    expect(f.text).toContain('About 3050 kcal'); // from the exact pace (-0.108), not the displayed -0.1
    expect(f.text).toContain('an estimate');
    expect(f.numbers).toEqual(expect.arrayContaining([3050, 3170, 120]));
  });
  it('is quiet when there is no goal, no trend, or the gap is only noise', () => {
    for (const id of ['m03-kcal-needs-goal', 'o03-odd-weighin', 'p06-not-gaining-da', 'm06-teen-cut-push']) expect(ids(sheetOf(id)), id).not.toContain('goal-pace');
  });
  it('behind: the pace the date needs, and never a kcal number under the 1,500 floor', () => {
    const base = sheetOf('d02-row-stuck');
    const mk = (needed: number, trend: number, status: 'behind' | 'ahead', latest = 84.8, maint = 3170) => sheet({
      now: base.now, memory: [], goals: [{ memoryId: 'g', text: 'Cut to 83 kg', metric: 'weight', target: 83, by: '2027-02-28', status, neededKgPerWeek: needed }],
      weight: { latest: { id: 'weight.latest', value: latest, unit: 'kg', confidence: 'measured' }, trend: { id: 'weight.trend', value: trend, unit: 'kg/week', confidence: 'measured' }, odd: [] },
      food28: { daysLogged: 20, daysComplete: 20, facts: [{ id: 'food28.maintenanceKcal', value: maint, unit: 'kcal', confidence: 'estimate' }] },
    });
    const slow = run(mk(-0.4, -0.1, 'behind'))[0];
    expect(slow.text).toContain('weeks after 2027-02-28');
    expect(slow.text).toContain('About 3050 kcal');
    const wrong = run(mk(-0.4, 0.1, 'behind'))[0];
    expect(wrong.text).toContain('not reached');
    const crazy = run(goalSheet({ latest: 80, target: 66, trend: -0.1, status: 'behind' }))[0];
    expect(crazy.text).toContain('a later date, not a harder push');
    expect(crazy.text).not.toContain('kcal a day');
    const low = run(goalSheet({ latest: 84.8, target: 83, trend: -0.1, status: 'behind', maint: 1600 }))[0];
    expect(low.text).not.toContain('kcal a day');
    expect(run(goalSheet({ latest: 84.8, target: 83, trend: -0.2, status: 'ahead' }))).toEqual([]); // 0.09 apart is noise
  });
  it('gives no kcal number to someone who says they are under 18, in every form the router knows (Codex, PR #135)', () => {
    const s = sheetOf('d02-row-stuck');
    for (const text of ['16 years old, in season', 'age 16', '17, plays handball', '16yo', '15-årig']) {
      const kid = { ...s, memory: [...s.memory, { id: 'x', text, topic: 'about' as const }] };
      expect(computeFindings(kid, {}).find((x) => x.id === 'goal-pace')!.text, text).not.toContain('kcal');
    }
  });
  const goalSheet = (o: { latest: number; target: number; trend: number; status: 'ahead' | 'behind'; maint?: number }) => {
    const base = sheetOf('d02-row-stuck');
    return sheet({
      now: base.now, memory: [], goals: [{ memoryId: 'g', text: 'Goal', metric: 'weight', target: o.target, by: '2027-02-28', status: o.status, neededKgPerWeek: 0 }],
      weight: { latest: { id: 'weight.latest', value: o.latest, unit: 'kg', confidence: 'measured' }, trend: { id: 'weight.trend', value: o.trend, unit: 'kg/week', confidence: 'measured' }, odd: [] },
      food28: { daysLogged: 20, daysComplete: 20, facts: [{ id: 'food28.maintenanceKcal', value: o.maint ?? 2500, unit: 'kcal', confidence: 'estimate' }] },
    });
  };
  it('a gain that is ahead of pace never says "eat more" (Codex, PR #135)', () => {
    const t = run(goalSheet({ latest: 70, target: 74, trend: 0.5, status: 'ahead' }))[0].text;
    expect(t).toContain('ease off the surplus');
    expect(t).not.toContain('eat more');
  });
  it('a pace the date needs that is too fast is never chased, ahead or behind (Codex, PR #135)', () => {
    const t = run(goalSheet({ latest: 80, target: 66, trend: -1.1, status: 'ahead' }))[0].text;
    expect(t).toContain('a later date, not a harder push');
    expect(t).not.toContain('kcal a day');
  });
  it('works out the intake from the exact remaining weight, not the pace shown to 0.1 (Codex, PR #135)', () => {
    const t = run(goalSheet({ latest: 80, target: 79.5, trend: -0.3, status: 'ahead' }))[0].text;
    expect(t).toContain('About 2470 kcal');
  });
});

describe('week load', () => {
  it('counts the planned lifting and sport days and fires from 6 a week', () => {
    expect(find(sheetOf('m07-wrestling-weighin'), 'week-load')!.text).toContain('5 lifting sessions plus 2 sport sessions (wrestling on Monday, wrestling on Wednesday): 7 sessions in 7 days');
    for (const id of ['p06-not-gaining-da', 'p08-missed-both', 'r04-whats-today', 'm03-kcal-needs-goal']) expect(ids(sheetOf(id)), id).not.toContain('week-load');
  });
  it('does not count a walk or mobility', () => {
    const s = sheetOf('m07-wrestling-weighin');
    const easy = { ...s, training: { ...s.training, plan: { ...s.training.plan, sportDays: { Monday: ['walk' as const], Wednesday: ['mobility' as const] } } } } as unknown as FactSheet;
    expect(computeFindings(easy, {}).map((f) => f.id)).not.toContain('week-load');
  });
});

describe('the plan: days that clash', () => {
  const noah = () => sheetOf('c01-conflicting-sleep'); // plan Wed, Fri, Mon; today is Tuesday 3 Nov
  it('knows a day with a session, and the day before and after it', () => {
    expect(dayLoad(noah(), '2026-11-04').onDay).toEqual(['Full body B']);
    expect(dayLoad(noah(), '2026-11-05')).toMatchObject({ onDay: [], dayBefore: ['Full body B'], dayAfter: ['Full body A'] });
  });
  it('flags every day for a three-day plan: a session moved to a free day makes two days in a row', () => {
    for (const d of ['2026-11-03', '2026-11-05', '2026-11-07', '2026-11-08']) expect(clashes(noah(), d), d).toBe(true);
    expect(planNotes(noah())[0]).toContain('sits next to one');
  });
  it('lists a free day when there really is one', () => {
    expect(planNotes(sheetOf('p03-want-to-quit'))[0]).toContain('Saturday 2026-11-07');
  });
  it("keeps today's dated plan: an override today, or a session cleared today, is not read from next week (Codex, PR #135)", () => {
    const s = sheetOf('d02-row-stuck'); // today is Tuesday, Pull; next Tuesday is Pull too
    const plan = (over: Record<string, unknown>) => ({ ...s, training: { ...s.training, plan: { ...s.training.plan, ...over } } }) as unknown as FactSheet;
    expect(dayLoad(s, '2026-11-03').onDay).toEqual(['Pull']);
    expect(dayLoad(plan({ today: undefined }), '2026-11-03').onDay).toEqual([]); // cleared today, still a Pull next Tuesday
    const overridden = plan({ today: 'Legs', next: s.training.plan.next.filter((n) => !n.day.startsWith('2026-11-10')) });
    expect(dayLoad(overridden, '2026-11-03').onDay).toEqual(['Legs']);
    expect(planNotes(plan({ today: undefined })).join(' ')).toContain('Tuesday 2026-11-03');
  });
  it('says nothing for a rotation plan, where the week is not fixed', () => {
    const s = noah();
    expect(planNotes({ ...s, training: { ...s.training, plan: { ...s.training.plan, note: 'rotation plan', next: [] } } } as unknown as FactSheet)).toEqual([]);
  });
});

describe('the sheet', () => {
  it('shows findings first and registers every finding number for the invented-number check', () => {
    const s = sheetOf('d02-row-stuck');
    const text = renderFacts(s);
    expect(text.indexOf('FINDINGS')).toBeGreaterThan(-1);
    expect(text.indexOf('FINDINGS')).toBeLessThan(text.indexOf('TARGETS'));
    for (const n of find(s, 'stalled-lifts')!.numbers) expect(sheetNumbers(s)).toContain(n);
  });
  it('has no FINDINGS block when nothing stands out', () => {
    expect(renderFacts(sheetOf('r04-whats-today'))).not.toContain('FINDINGS');
  });
});

describe('coverage on the 20 tuning cases (free, offline)', () => {
  /** which finding hands the model the answer to a catch item. Written from the catch lists, not from the findings' output. */
  const SUPPLIES: Record<string, Finding['id'] | 'plan-notes'> = {
    'p03.next-weight': 'stalled-lifts', 'p03.dropping': 'sessions-dropping', 'p03.food-log': 'low-food-log', 'p03.next-step': 'sessions-dropping',
    'n02.food-log': 'low-food-log', 'n02.dropping': 'sessions-dropping',
    'm07.pace': 'goal-pace', 'm07.load': 'week-load',
    'd02.stalled': 'stalled-lifts', 'd02.next': 'stalled-lifts', 'd02.cut-pace': 'goal-pace', 'd02.why': 'week-load',
    'd01.load': 'week-load', 'd01.cut-pace': 'goal-pace',
    'p08.streak': 'sessions-dropping', 'p08.next': 'sessions-dropping', 'p08.add-weight': 'stalled-lifts',
    'c01.no-clash': 'plan-notes',
  };
  it('every item that findings claim to supply is on the sheet of its case', () => {
    for (const [item, source] of Object.entries(SUPPLIES)) {
      const caseId = TUNING.find((c) => CATCH[c].some((x) => x.id === item))!;
      const s = sheetOf(caseId);
      if (source === 'plan-notes') expect(planNotes(s).length, item).toBeGreaterThan(0);
      else expect(ids(s), item).toContain(source);
    }
  });
  it('no finding fires on a case that has nothing for it to say (false-alarm guard)', () => {
    const quiet = ['p10-footballer-speed-da', 'm03-kcal-needs-goal', 'm04-knee-escalate', 'o09-healthy-adult-creatine', 'r04-whats-today', 'p14-race-week-da', 'c01-conflicting-sleep', 'p06-not-gaining-da', 'p09-first-open-beginner', 'm08-nights-week', 'm06-teen-cut-push', 'p13-home-plan'];
    for (const id of quiet) expect(ids(sheetOf(id)), id).toEqual([]);
  });
  it('findings supply a minority of the items: the rest is expertise, tone or what the sheet already says', () => {
    const items = TUNING.flatMap((c) => CATCH[c]);
    expect(Object.keys(SUPPLIES).length / items.length).toBeLessThan(0.2);
    expect(items).toHaveLength(119);
  });
});
