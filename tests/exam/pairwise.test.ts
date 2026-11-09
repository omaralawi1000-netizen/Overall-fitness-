import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Ledger, type GeminiReply } from '../../exam/providers';
import { asSide, barPairs, barRules, combine, fromBarPair, judgePair, pairBody, pairGate, readPair, type OrderDone, type PairVerdict } from '../../exam/judge/pairwise';

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
    expect(() => readPair('{"brokenA":[15],"brokenB":[],"saferIs":"tie","winner":"B","reason":"x"}')).toThrow();
    expect(() => readPair('{"brokenA":[],"brokenB":[],"saferIs":"tie","winner":"C","reason":"x"}')).toThrow();
    expect(() => readPair('not json')).toThrow();
  });

  it('the judge never sees which AI wrote an answer, and sees the Answer Bar', () => {
    const body = pairBody({ id: 'x', facts: 'f', conversation: [{ role: 'user', text: 'hi' }], a: { reply: 'As Claude I think…', did: [] }, b: { reply: 'Gemini says', did: ['protein target 215 → 250 g'] } });
    const all = JSON.stringify(body);
    expect(all).not.toMatch(/Claude|Gemini/);
    expect(body.systemInstruction!.parts[0].text).toContain('## 14. One voice');
    expect(all).toContain('protein target 215 → 250 g');
  });

  it('the neutral judge sees no Answer Bar, checklist or writer\'s note, only facts, conversation and replies', () => {
    const body = pairBody({ id: 'x', facts: 'kcal target 3,000', conversation: [{ role: 'user', text: 'hi' }], good: 'WRITER NOTE', checklist: ['MUST: CHECK ITEM'], a: { reply: 'A reply', did: [] }, b: { reply: 'B reply', did: ['logged 2 eggs'] }, neutral: true });
    const all = JSON.stringify(body);
    expect(all).not.toMatch(/## 14\. One voice|ANSWER BAR|WRITER NOTE|CHECK ITEM/);
    expect(all).toContain('kcal target 3,000');
    expect(all).toContain('logged 2 eggs');
    expect(all).toContain('no house style');
  });
});

describe('calibration from the Answer Bar itself', () => {
  const pairs = barPairs();
  it('has a matched Good/Bad pair for every rule', () => {
    expect(new Set(pairs.map((p) => p.rule))).toEqual(new Set(Array.from({ length: 14 }, (_, i) => i + 1)));
    expect(pairs.length).toBeGreaterThanOrEqual(14);
  });
  it("never leaks the verdict: no trailing \"(why it fails)\" notes or quote marks around the reply", () => {
    for (const p of pairs) for (const s of [p.good, p.bad]) {
      expect(s.reply).not.toMatch(/read aloud|stated as the cause|did it, but|a headline taken|a dose for a minor|no answer\)|asked last|ignored the ask/);
      expect(s.reply).not.toMatch(/^"|"$/);
      expect(s.reply.length).toBeGreaterThan(10);
      for (const d of s.did) expect(d).not.toMatch(/\(|Did in the app/);
    }
  });
  it('the judge sees the rules but never the labelled examples it is calibrated on (Codex, PR #75)', () => {
    const rules = barRules();
    expect(rules).toContain('## 14. One voice');
    expect(rules).toContain('Checked by:');
    expect(rules).not.toMatch(/\*\*Good|\*\*Bad|^> |Facts:/m);
    for (const p of pairs) {
      const sys = pairBody(fromBarPair(p, true)).systemInstruction!.parts[0].text!;
      expect(sys, p.id).not.toContain(p.good.reply.slice(0, 40));
      expect(sys, p.id).not.toContain(p.bad.reply.slice(0, 40));
    }
  });

  it('every pair carries its own facts, apart from both answers (Codex, PR #75)', () => {
    for (const p of pairs) expect(p.facts, p.id).toMatch(/\w{3}/);
    const p = pairs.find((x) => /set my protein target to 250/.test(x.said))!;
    expect(fromBarPair(p, true).facts).toMatch(/13 of the last 28 days/);
    expect(pairBody(fromBarPair(p, true)).systemInstruction!.parts[0].text).toMatch(/FACTS THE COACH HAD:\n.*13 of the last 28 days/);
  });

  it('an example that says it did something carries what the app did (Codex, PR #75)', () => {
    const bench = pairs.find((p) => /bench 80/.test(p.said))!;
    expect(bench.good.did).toEqual(['logged bench press 80 kg × 8, 8, 6']);
    expect(bench.bad.did).toEqual(['logged bench press 80 kg × 8, 8, 6']);
    const protein = pairs.find((p) => /set my protein target to 250/.test(p.said))!;
    expect(protein.bad.did).toEqual(['protein target 215 → 250 g']);
    for (const p of pairs) for (const x of [p.good, p.bad]) if (/^(?:Logged|Done|Updated|Protein target set)/.test(x.reply)) expect(x.did.length, `${p.id}: ${x.reply.slice(0, 40)}`).toBeGreaterThan(0);
  });

  it('moves app changes out of the words', () => {
    expect(asSide('"Done." + *Did in the app: forgot "x" · Undo*')).toEqual({ reply: 'Done.', did: ['forgot "x"'] });
    expect(asSide('"Logged ✅ 80 kg × 8" (read aloud this is bad).')).toEqual({ reply: 'Logged ✅ 80 kg × 8', did: [] });
  });
  it('the gate wants Good in both orders on 90 % and never Bad', () => {
    const p = pairs[0];
    // orders are already in the caller's A/B terms (combine turns the second back)
    const won = (winner: 'A' | 'B' | 'tie', orders: [PairVerdict, PairVerdict] = [v(winner), v(winner)]) => ({ id: 'x', winner, saferIs: 'tie' as const, brokenA: [], brokenB: [], orders, usd: 0 });
    expect(fromBarPair(p, false).a).toEqual(p.bad);
    const all = pairs.map((pair, i) => ({ pair, goodFirst: i % 2 === 0, r: won(i % 2 === 0 ? 'A' : 'B') }));
    expect(pairGate(all).pass).toBe(true);
    all[0].r = won('B');
    expect(pairGate(all)).toMatchObject({ pass: false, wrong: [pairs[0].id] });
    // Good in one order and Bad in the other is a tie for scoring, but a failed calibration (Codex, PR #75)
    all[0].r = won('tie', [v('A'), v('B')]);
    expect(pairGate(all)).toMatchObject({ pass: false, wrong: [pairs[0].id] });
  });
});

describe('each paid order is kept (Codex, PR #75)', () => {
  const verdict = (winner: string): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ brokenA: [], brokenB: [], saferIs: 'tie', winner, reason: 'r' }) }] } }], usage: { inTokens: 1, cachedTokens: 0, outTokens: 1, searches: 0 }, usd: 0.01 });
  const x = fromBarPair(barPairs()[0], true);
  const ledger = () => new Ledger(join(mkdtempSync(join(tmpdir(), 'pair-')), 'l.jsonl'), 1);

  it('saves the first order before asking the second, and a rerun pays only for the missing order', async () => {
    const saved: OrderDone[] = [];
    let calls = 0;
    const failSecond = () => { calls++; if (calls === 2) throw new Error('network'); return verdict('A'); };
    await expect(judgePair('claude-opus-5-5', x, { ledger: ledger(), purpose: 't', dry: failSecond }, [], (k, d) => { saved[k] = d; })).rejects.toThrow('network');
    expect(saved[0]?.v.winner).toBe('A');

    let rerunCalls = 0;
    const r = await judgePair('claude-opus-5-5', x, { ledger: ledger(), purpose: 't', dry: () => { rerunCalls++; return verdict('B'); } }, [saved[0], undefined]);
    expect(rerunCalls).toBe(1);
    expect(r.winner).toBe('A');
  });
});

describe('the calibration print (Codex, PR #86)', () => {
  it('changes with the judge, the effort and the neutral prompt, so an old pass never vouches for a new setup', async () => {
    const { calibrationPrint } = await import('../../exam/judge/pairwise');
    const base = calibrationPrint('claude-opus-5-5', 'medium', false);
    expect(calibrationPrint('claude-opus-5-5', 'medium', false)).toBe(base);
    expect(calibrationPrint('claude-opus-5-5', 'high', false)).not.toBe(base);
    expect(calibrationPrint('claude-opus-5-5', 'medium', true)).not.toBe(base);
  });

  it('scores the worst of repeated runs, a safer-B run first (Codex, PR #86)', async () => {
    const { worstRun } = await import('../../exam/judge/pairwise');
    const r = (winner: 'A' | 'B' | 'tie', saferIs: 'A' | 'B' | 'tie' = 'tie') => ({ id: 'x', winner, saferIs, brokenA: [], brokenB: [], orders: [] }) as never;
    expect(worstRun([r('A'), r('tie'), r('A')]).winner).toBe('tie');
    expect(worstRun([r('A'), r('B'), r('tie')]).winner).toBe('B');
    expect(worstRun([r('B'), r('A', 'B')]).saferIs).toBe('B');
    expect(worstRun([r('A')]).winner).toBe('A');
  });
});
