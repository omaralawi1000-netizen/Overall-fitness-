import { describe, expect, it } from 'vitest';
import { asSide, barPairs, combine, fromBarPair, pairBody, pairGate, readPair, type PairVerdict } from '../../exam/judge/pairwise';

const v = (winner: 'A' | 'B' | 'tie', saferIs: 'A' | 'B' | 'tie' = 'tie', brokenA: number[] = [], brokenB: number[] = []): PairVerdict => ({ winner, saferIs, brokenA, brokenB, reason: 'r' });

describe('the pairwise judge', () => {
  it('a winner must win in both orders; a split is a tie (position bias cancelled)', () => {
    // second order is A/B swapped: its "B" is our A
    expect(combine(v('A'), v('B')).winner).toBe('A');
    expect(combine(v('A'), v('A')).winner).toBe('tie');
    expect(combine(v('tie'), v('B')).winner).toBe('tie');
    expect(combine(v('B', 'B'), v('A', 'A')).saferIs).toBe('B');
  });

  it('broken rules are the union over both orders, mapped back to the right answer', () => {
    const r = combine(v('A', 'tie', [1], [3, 7]), v('B', 'tie', [7, 8], [2]));
    expect(r.brokenA).toEqual([1, 2]);
    expect(r.brokenB).toEqual([3, 7, 8]);
  });

  it('reads only a complete, in-range verdict', () => {
    expect(readPair('{"brokenA":[3,3],"brokenB":[],"saferIs":"tie","winner":"B","reason":"x"}')).toEqual({ brokenA: [3], brokenB: [], saferIs: 'tie', winner: 'B', reason: 'x' });
    expect(() => readPair('{"brokenA":[14],"brokenB":[],"saferIs":"tie","winner":"B","reason":"x"}')).toThrow();
    expect(() => readPair('{"brokenA":[],"brokenB":[],"saferIs":"tie","winner":"C","reason":"x"}')).toThrow();
    expect(() => readPair('not json')).toThrow();
  });

  it('the judge never sees which AI wrote an answer, and sees the Answer Bar', () => {
    const body = pairBody({ id: 'x', facts: 'f', conversation: [{ role: 'user', text: 'hi' }], a: { reply: 'As Claude I think…', did: [] }, b: { reply: 'Gemini says', did: ['protein target 215 → 250 g'] } });
    const all = JSON.stringify(body);
    expect(all).not.toMatch(/Claude|Gemini/);
    expect(body.systemInstruction!.parts[0].text).toContain('## 13. Tone');
    expect(all).toContain('protein target 215 → 250 g');
  });
});

describe('calibration from the Answer Bar itself', () => {
  const pairs = barPairs();
  it('has a matched Good/Bad pair for every rule', () => {
    expect(new Set(pairs.map((p) => p.rule))).toEqual(new Set(Array.from({ length: 13 }, (_, i) => i + 1)));
    expect(pairs.length).toBeGreaterThanOrEqual(13);
  });
  it("never leaks the verdict: no trailing \"(why it fails)\" notes or quote marks around the reply", () => {
    for (const p of pairs) for (const s of [p.good, p.bad]) {
      expect(s.reply).not.toMatch(/read aloud|stated as the cause|did it, but|a headline taken|a dose for a minor|no answer\)|asked last|ignored the ask/);
      expect(s.reply).not.toMatch(/^"|"$/);
      expect(s.reply.length).toBeGreaterThan(10);
      for (const d of s.did) expect(d).not.toMatch(/\(|Did in the app/);
    }
  });
  it('moves app changes out of the words', () => {
    expect(asSide('"Done." + *Did in the app: forgot "x" · Undo*')).toEqual({ reply: 'Done.', did: ['forgot "x"'] });
    expect(asSide('"Logged ✅ 80 kg × 8" (read aloud this is bad).')).toEqual({ reply: 'Logged ✅ 80 kg × 8', did: [] });
  });
  it('the gate wants Good in both orders on 90 % and never Bad', () => {
    const p = pairs[0];
    const won = (winner: 'A' | 'B' | 'tie') => ({ id: 'x', winner, saferIs: 'tie' as const, brokenA: [], brokenB: [], orders: [v('A'), v('B')] as [PairVerdict, PairVerdict], usd: 0 });
    expect(fromBarPair(p, false).a).toEqual(p.bad);
    const all = pairs.map((pair, i) => ({ pair, goodFirst: i % 2 === 0, r: won(i % 2 === 0 ? 'A' : 'B') }));
    expect(pairGate(all).pass).toBe(true);
    all[0].r = won('B');
    expect(pairGate(all)).toMatchObject({ pass: false, wrong: [pairs[0].id] });
  });
});
