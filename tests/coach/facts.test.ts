import { describe, expect, it } from 'vitest';
import { buildFacts, renderFacts, sheetNumbers } from '../../src/coach/facts';
import type { AnyRecord } from '../../src/engine/model';

const TZ = 'Europe/Copenhagen';
const NOW = Date.parse('2026-11-03T15:00:00+01:00');
const at = (day: string, hh = '12') => Date.parse(`${day}T${hh}:00:00+01:00`);
let n = 0;
const env = (kind: string, day: string, extra: Record<string, unknown>, hh = '12') =>
  ({ id: `${kind}${n++}`, kind, v: 1, at: at(day, hh), tz: TZ, day, source: 'tap', createdAt: 0, updatedAt: 0, rev: 1, stamp: 's', ...extra }) as unknown as AnyRecord;
const settings = (targets: Record<string, number>) => env('settings', '2026-10-01', { language: 'en', dayStartHour: 0, weekStart: 1, units: {}, restDefaultSec: 120, targets });
const food = (day: string, kcal: number, protein?: number) => env('food', day, { name: 'x', meal: 'lunch', dataSource: 'reference', portion: { amount: 1, unit: 'portion' }, estimated: false, nutrients: { kcal, ...(protein !== undefined ? { protein } : {}) } });
const complete = (day: string) => ({ ...env('dayNote', day, { foodComplete: true }), id: `day:${day}` }) as AnyRecord;
const weigh = (day: string, kg: number, hh = '07') => env('bodyweight', day, { kg }, hh);
const r1 = (x: number) => Math.round(x * 10) / 10;
const days = (from: string, count: number) => Array.from({ length: count }, (_, i) => { const d = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86400000); return d.toISOString().slice(0, 10); });

describe('the fact sheet', () => {
  it('missing is never zero: no food today means no food fact, not 0', () => {
    const s = buildFacts([settings({ kcal: 2500 })], { now: NOW, tz: TZ });
    expect(s.today.food).toEqual([]);
    expect(s.today.left).toEqual([]);
    expect(s.food28.facts).toEqual([]);
    expect(sheetNumbers(s)).toEqual([2500, 0, 0, 0, 0]); // the target, then counts that really are zero (days logged, sessions)
    expect(s.trust.join(' ')).toContain('Food was logged on 0 of the last 28 days');
  });

  it("today's food is 'logged so far' until the day is marked complete", () => {
    const s = buildFacts([settings({ kcal: 2500, protein: 180 }), food('2026-11-03', 1316, 131)], { now: NOW, tz: TZ });
    expect(s.today.food.find((f) => f.id === 'today.kcal')).toMatchObject({ value: 1316, confidence: 'partial' });
    expect(s.today.left.find((f) => f.id === 'today.kcalLeft')?.value).toBe(1184);
    expect(s.today.left.find((f) => f.id === 'today.proteinLeft')?.value).toBe(49);
    expect(s.trust.join(' ')).toContain('logged so far');
  });

  it('averages use complete days; a plain average of logged days is labelled partial (logged food is not all food)', () => {
    const recs: AnyRecord[] = [settings({ kcal: 2500 })];
    for (const d of days('2026-10-20', 9)) recs.push(food(d, 850));
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.food28.facts.find((f) => f.id === 'food28.kcalAvgComplete')).toBeUndefined();
    expect(s.food28.facts.find((f) => f.id === 'food28.kcalAvgLogged')).toMatchObject({ value: 850, confidence: 'partial' });
    expect(s.food28).toMatchObject({ daysLogged: 9, daysComplete: 0 });

    for (const d of days('2026-10-20', 3)) recs.push(complete(d));
    const s2 = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s2.food28.facts.find((f) => f.id === 'food28.kcalAvgComplete')).toMatchObject({ value: 850, confidence: 'measured' });
  });

  it('a complete day where some food has no protein value: its protein is partial, kcal still measured (Codex, PR #73)', () => {
    const recs: AnyRecord[] = [settings({ kcal: 2500, protein: 180 }), food('2026-11-03', 800, 60), food('2026-11-03', 700), complete('2026-11-03')];
    for (const d of days('2026-10-20', 3)) recs.push(food(d, 2000, 150), food(d, 400), complete(d));
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.today.food.find((f) => f.id === 'today.kcal')).toMatchObject({ value: 1500, confidence: 'measured' });
    expect(s.today.food.find((f) => f.id === 'today.protein')).toMatchObject({ value: 60, confidence: 'partial', note: 'some foods today have no protein value' });
    expect(s.food28.facts.find((f) => f.id === 'food28.kcalAvgComplete')).toBeDefined();
    expect(s.food28.facts.find((f) => f.id === 'food28.proteinAvgComplete')).toBeUndefined();
  });

  it('estimated food keeps its label: a complete day of estimates is an estimate, not a measurement (Codex, PR #73)', () => {
    const guess = (day: string, kcal: number) => ({ ...(food(day, kcal) as object), estimated: true }) as AnyRecord;
    const recs: AnyRecord[] = [settings({ kcal: 2500 }), guess('2026-11-03', 800), complete('2026-11-03')];
    for (const d of days('2026-10-20', 3)) recs.push(food(d, 2000), complete(d));
    recs.push(guess('2026-10-20', 300));
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.today.food.find((f) => f.id === 'today.kcal')).toMatchObject({ value: 800, confidence: 'estimate', note: 'includes estimated foods' });
    expect(s.today.left.find((f) => f.id === 'today.kcalLeft')).toMatchObject({ value: 1700, confidence: 'estimate' });
    expect(s.food28.facts.find((f) => f.id === 'food28.kcalAvgComplete')).toMatchObject({ value: 2100, confidence: 'estimate', note: 'average of 3 complete days, 1 with estimated foods' });
    expect(renderFacts(s)).toContain('today.kcal: 800 kcal (estimate)');
  });

  it('counts the days the protein target was hit (the protein-250 answer)', () => {
    const recs: AnyRecord[] = [settings({ protein: 215 })];
    days('2026-10-06', 28).forEach((d, i) => recs.push(food(d, 2500, i < 13 ? 220 : 180)));
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.food28.facts.find((f) => f.id === 'food28.proteinTargetDays')).toMatchObject({ value: 13, unit: 'of 28 logged days' });
  });

  it('a weight trend needs 6 weigh-ins over 14 days, and odd weigh-ins are flagged and left out', () => {
    const few = buildFacts([weigh('2026-11-01', 86), weigh('2026-11-02', 85.8)], { now: NOW, tz: TZ });
    expect(few.weight.trend).toBeUndefined();
    expect(few.trust.join(' ')).toContain('No weight trend yet');

    const recs: AnyRecord[] = days('2026-10-14', 20).map((d, i) => weigh(d, 88 - i * 0.1));
    recs.push(weigh('2026-11-03', 86.0, '07'), weigh('2026-11-03', 88.4, '08'));
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.weight.trend).toMatchObject({ value: -0.7, unit: 'kg/week' });
    expect(s.weight.latest?.value).toBe(86);
    expect(s.weight.odd).toEqual([expect.objectContaining({ kg: 88.4, day: '2026-11-03' })]);
    expect(s.trust.join(' ')).toContain('88.4 kg on 2026-11-03');
  });

  it('a single typo weigh-in far from recent weight is odd, never the latest weight or the trend (Codex, PR #73)', () => {
    const recs: AnyRecord[] = [...days('2026-10-13', 20).map((d) => weigh(d, 80)), weigh('2026-11-02', 180)];
    const s = buildFacts(recs, { now: NOW, tz: TZ });
    expect(s.weight.latest?.value).toBe(80);
    expect(s.weight.trend?.value).toBe(0);
    expect(s.weight.odd).toEqual([expect.objectContaining({ kg: 180 })]);
    // two typos on one day: the closer one is no more plausible than the other (Codex, PR #73)
    const two = buildFacts([...days('2026-10-13', 20).map((d) => weigh(d, 80)), weigh('2026-11-02', 180, '07'), weigh('2026-11-02', 182, '08')], { now: NOW, tz: TZ });
    expect(two.weight.latest?.value).toBe(80);
    expect(two.weight.odd.map((w) => w.kg)).toEqual([180, 182]);
    // a real 2 kg drop after a hard week is kept
    expect(buildFacts([...days('2026-10-13', 20).map((d) => weigh(d, 80)), weigh('2026-11-02', 78)], { now: NOW, tz: TZ }).weight.latest?.value).toBe(78);
  });

  it('two weigh-ins far apart with no history: neither is trusted', () => {
    const s = buildFacts([weigh('2026-11-03', 86.0, '07'), weigh('2026-11-03', 88.4, '08')], { now: NOW, tz: TZ });
    expect(s.weight.latest).toBeUndefined();
    expect(s.weight.odd).toHaveLength(2);
  });

  it('ended memory is never current (the healed shoulder)', () => {
    const mem = (text: string, until?: string) => env('memory', '2026-10-01', { text, topic: 'health', scope: until ? 'oneOff' : 'standing', validFrom: '2026-10-01', lastSeen: 0, origin: 'said', ...(until ? { validUntil: until } : {}) });
    const s = buildFacts([mem('left shoulder sore', '2026-10-20'), mem('takes sets to failure')], { now: NOW, tz: TZ });
    expect(s.memory.map((m) => m.text)).toEqual(['takes sets to failure']);
    expect(s.ended).toEqual([expect.objectContaining({ text: 'left shoulder sore', endedOn: '2026-10-20' })]);
    const text = renderFacts(s);
    expect(text).toMatch(/ENDED \(past, not current\):\n- memory\d+ left shoulder sore \(ended 2026-10-20\)/);
    // every card shows its id, so a "forget that" can name the card (Codex, PR #73)
    expect(text).toContain(`- ${s.memory[0].id} [health] takes sets to failure`);
  });

  it('a weight goal already reached says so (the stale "cutting" goal)', () => {
    const goal = env('memory', '2026-09-01', { text: 'cut to 83 kg', topic: 'goal', scope: 'standing', validFrom: '2026-09-01', lastSeen: 0, origin: 'said', goal: { metric: 'weight', target: 83, by: '2027-02-28', startDate: '2026-09-01', start: 88 } });
    const recs: AnyRecord[] = [goal, ...days('2026-10-10', 20).map((d) => weigh(d, 82.8))];
    expect(buildFacts(recs, { now: NOW, tz: TZ }).goals[0].status).toBe('reached');
  });

  it('an ended or not-yet-started goal is not a current goal (Codex, PR #73)', () => {
    const g = (validFrom: string, validUntil?: string) => env('memory', '2026-09-01', { text: 'cut to 83 kg', topic: 'goal', scope: 'standing', validFrom, lastSeen: 0, origin: 'said', ...(validUntil ? { validUntil } : {}), goal: { metric: 'weight', target: 83, by: '2027-02-28', startDate: '2026-09-01', start: 88 } });
    expect(buildFacts([g('2026-09-01', '2026-10-01')], { now: NOW, tz: TZ }).goals).toEqual([]);
    expect(buildFacts([g('2026-12-01')], { now: NOW, tz: TZ }).goals).toEqual([]);
    expect(buildFacts([g('2026-09-01', '2026-11-03')], { now: NOW, tz: TZ }).goals).toHaveLength(1);
  });

  it('a cut with no start weight takes its direction from the weigh-ins near its start, so going past the target is reached (Codex, PR #73)', () => {
    const goal = env('memory', '2026-10-06', { text: 'cut to 83 kg', topic: 'goal', scope: 'standing', validFrom: '2026-10-06', lastSeen: 0, origin: 'said', goal: { metric: 'weight', target: 83, by: '2027-02-28', startDate: '2026-10-06' } });
    const recs: AnyRecord[] = [goal, ...days('2026-10-06', 28).map((d, i) => weigh(d, r1(84.5 - i * 0.07)))];
    expect(buildFacts(recs, { now: NOW, tz: TZ }).goals[0].status).toBe('reached');
    // no start weight and no weigh-in near the start date: the direction is unknown, so it can't be judged
    expect(buildFacts([goal, weigh('2026-11-02', 82.6)], { now: NOW, tz: TZ }).goals[0].status).toBe('cantJudge');
  });

  it('goal pace comes from the trend and the date, never guessed', () => {
    const goal = env('memory', '2026-09-01', { text: 'cut to 83 kg', topic: 'goal', scope: 'standing', validFrom: '2026-09-01', lastSeen: 0, origin: 'said', goal: { metric: 'weight', target: 83, by: '2027-02-28', startDate: '2026-09-01', start: 88 } });
    const recs: AnyRecord[] = [goal, ...days('2026-10-14', 21).map((d, i) => weigh(d, 88 - i * 0.1))];
    const g = buildFacts(recs, { now: NOW, tz: TZ }).goals[0];
    expect(g.status).toBe('ahead');
    expect(g.neededKgPerWeek).toBeLessThan(0);
    expect(buildFacts([goal], { now: NOW, tz: TZ }).goals[0].status).toBe('cantJudge');
    // a deadline that passed unreached is missed, with no made-up pace (Codex, PR #73)
    const late = env('memory', '2026-09-01', { text: 'cut to 75 kg', topic: 'goal', scope: 'standing', validFrom: '2026-09-01', lastSeen: 0, origin: 'said', goal: { metric: 'weight', target: 75, by: '2026-10-31', startDate: '2026-09-01', start: 84 } });
    const missed = buildFacts([late, ...days('2026-10-14', 21).map((d) => weigh(d, 80))], { now: NOW, tz: TZ }).goals[0];
    expect(missed).toMatchObject({ status: 'missed' });
    expect(missed.neededKgPerWeek).toBeUndefined();
  });

  it('render lists every number with its id, in the person\'s language', () => {
    const recs = [{ ...settings({ kcal: 3000 }), language: 'da' } as AnyRecord, food('2026-11-03', 1316)];
    const text = renderFacts(buildFacts(recs, { now: NOW, tz: TZ }));
    expect(text).toContain('- target.kcal: 3.000 kcal');
    expect(text).toContain('- today.kcal: 1.316 kcal (partial): logged so far');
  });
});
