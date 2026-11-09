import { describe, expect, it } from 'vitest';
import { parseWeights, putWeight, recent, weekChange } from '../../src/app/weights';

describe('the weight log', () => {
  it('reads what is stored and drops anything that is not a real weigh-in', () => {
    const raw = JSON.stringify([{ d: '2026-11-02', kg: 80.04 }, { d: 'x', kg: 80 }, { d: '2026-11-03', kg: 5 }, { d: '2026-11-01', kg: 81 }, { d: '2026-11-02', kg: 79.9 }, null]);
    expect(parseWeights(raw)).toEqual([{ d: '2026-11-01', kg: 81 }, { d: '2026-11-02', kg: 79.9 }]);
    expect(parseWeights('{bad')).toEqual([]);
    expect(parseWeights(null)).toEqual([]);
    expect(parseWeights('{"a":1}')).toEqual([]);
  });
  it('today replaces today, and a number that is not a weight is refused', () => {
    const a = putWeight([], '2026-11-03', 80)!;
    const b = putWeight(a, '2026-11-03', 79.46)!;
    expect(b).toEqual([{ d: '2026-11-03', kg: 79.5 }]);
    expect(putWeight(b, '2026-11-04', NaN)).toBeNull();
    expect(putWeight(b, '2026-11-04', 3)).toBeNull();
    expect(putWeight(b, '2026-11-04', 900)).toBeNull();
  });
  it('the week change needs two weigh-ins inside the week', () => {
    expect(weekChange([])).toBeNull();
    expect(weekChange([{ d: '2026-11-09', kg: 80 }])).toBeNull();
    expect(weekChange([{ d: '2026-10-20', kg: 82 }, { d: '2026-11-09', kg: 80 }])).toBeNull();
    expect(weekChange([{ d: '2026-11-02', kg: 80.6 }, { d: '2026-11-05', kg: 80.2 }, { d: '2026-11-09', kg: 80.2 }])).toBe(-0.4);
  });
  it('the chart takes the newest fourteen', () => {
    const l = Array.from({ length: 20 }, (_, i) => ({ d: `2026-10-${String(i + 1).padStart(2, '0')}`, kg: 80 }));
    expect(recent(l)).toHaveLength(14);
    expect(recent(l)[0].d).toBe('2026-10-07');
  });
});
