import { describe, expect, it } from 'vitest';
import { band, kappa, lengthCorrelation, longerPicked, type Outcome } from '../../exam/judge/agreement';

const pairs = (s: string) => s.split(' ').map((x) => ({ omar: x[0] as Outcome, judge: (x[1] === 'T' ? 'tie' : x[1]) as Outcome })).map((p) => ({ ...p, omar: (p.omar as string) === 'T' ? 'tie' as const : p.omar }));

describe('judge agreement with Omar', () => {
  it("Cohen's kappa: perfect, chance and a known case", () => {
    expect(kappa(pairs('AA BB TT AA BB')).kappa).toBe(1);
    // all-A on both sides is agreement but no information beyond chance
    expect(kappa(pairs('AA AA AA')).kappa).toBe(1);
    const k = kappa(pairs('AA AA AB BB BB BA TT TA')).kappa;
    expect(k).toBeCloseTo(0.4, 1);
    expect(band(0.8)).toBe('decide');
    expect(band(0.7)).toBe('triage');
    expect(band(0.5)).toBe('fix the rubric');
  });
  it('length bias both ways', () => {
    const long = [{ pick: 'A' as const, wordsA: 200, wordsB: 50 }, { pick: 'B' as const, wordsA: 40, wordsB: 150 }, { pick: 'tie' as const, wordsA: 10, wordsB: 300 }];
    expect(longerPicked(long)).toEqual({ rate: 1, n: 2 });
    expect(lengthCorrelation(long)).toBeGreaterThan(0.5);
    const short = long.map((p) => ({ ...p, pick: p.pick === 'A' ? 'B' as const : p.pick === 'B' ? 'A' as const : p.pick }));
    expect(longerPicked(short).rate).toBe(0);
  });
});
