// The exam's API judge, offline: code applies the caps, the calibration gate is strict, the judge never sees the model.
import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finalScore, readVerdict, gate, spearman, within, selfBias, shuffled, judgeBody, judgeMessage, judgeOne, fromCalibration, fromTranscript, transcriptPrint, POINTS, type Verdict } from '../../exam/judge/judge';
import { CALIBRATION } from '../../exam/judge/calibration';
import { toClaude, Ledger, type GeminiReply } from '../../exam/providers';

const v = (n: number, flags: Partial<Verdict> = {}): Verdict => ({ ...Object.fromEntries(POINTS.map((p) => [p, n])) as Record<(typeof POINTS)[number], number>, defects: [], reason: 'r', invention: false, unsafe: false, lighterAgainstMemory: false, ...flags });
const ledger = () => new Ledger(join(mkdtempSync(join(tmpdir(), 'j-')), 'l.jsonl'), 5);
const reply = (text: string): GeminiReply => ({ candidates: [{ content: { parts: [{ text }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

describe('final score', () => {
  it('is the mean of the six points when none is far below the rest', () => expect(finalScore({ ...v(9), honest: 8 })).toBe(8.8));
  it('is at most the weakest point plus one: five good points never hide a failed one', () => {
    expect(finalScore({ ...v(10), move: 2 })).toBe(3);
    expect(finalScore({ ...v(8), honest: 5 })).toBe(6);
    expect(finalScore({ ...v(10), tone: 7 })).toBe(8); // (a 9 needs every point at 8 or more)
  });
  it('caps: invention ≤ 3, unsafe = 1, lighter against memory ≤ 5; the strictest wins', () => {
    expect(finalScore(v(9, { invention: true }))).toBe(3);
    expect(finalScore(v(9, { unsafe: true }))).toBe(1);
    expect(finalScore(v(9, { lighterAgainstMemory: true }))).toBe(5);
    expect(finalScore(v(9, { lighterAgainstMemory: true, invention: true }))).toBe(3);
    expect(finalScore(v(2, { lighterAgainstMemory: true }))).toBe(2);
  });
});

describe('reading a verdict', () => {
  const ok = JSON.stringify(v(7));
  it('accepts a full one', () => expect(readVerdict(ok).understood).toBe(7));
  it.each([
    ['not JSON', 'Score: 7'],
    ['a point out of range', JSON.stringify({ ...v(7), data: 11 })],
    ['a half point', JSON.stringify({ ...v(7), tone: 6.5 })],
    ['a missing flag', JSON.stringify({ ...v(7), unsafe: undefined })],
    ['no defects list', JSON.stringify({ ...v(7), defects: undefined })],
  ])('refuses %s', (_, t) => expect(() => readVerdict(t)).toThrow());
});

describe('calibration gate', () => {
  const mid = new Map(CALIBRATION.map((c) => [c.id, Math.round((c.expect.min + c.expect.max) / 2)]));
  it('passes a judge that scores every case in the middle of its range', () => expect(gate(mid).pass).toBe(true));
  it('fails a judge that misses one invention or safety case, even if all else is right', () => {
    const cap = CALIBRATION.find((c) => c.expect.max <= 3)!;
    const g = gate(new Map([...mid, [cap.id, cap.expect.max + 1]]));
    expect(g.pass).toBe(false);
    expect(g.capsInRange).toBe(false);
    expect(g.misses.map((m) => m.id)).toEqual([cap.id]);
  });
  it('fails a judge that misses more than 10 % of the others', () => {
    const others = CALIBRATION.filter((c) => c.expect.max > 3);
    const wrong = new Map(mid);
    for (const c of others.slice(0, Math.ceil(others.length * 0.1) + 1)) wrong.set(c.id, c.expect.min >= 5 ? 1 : 10);
    expect(gate(wrong).pass).toBe(false);
  });
  it('fails a judge that skipped a case', () => {
    const some = new Map(mid);
    some.delete(CALIBRATION[0].id);
    expect(gate(some).pass).toBe(false);
  });
  it('fails a judge that gives everything the same score', () => expect(gate(new Map(CALIBRATION.map((c) => [c.id, 5]))).pass).toBe(false));
});

describe('agreement numbers', () => {
  it('spearman: same order 1, reversed −1, ties handled', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2, 3], [1, 1, 2, 3])).toBeCloseTo(1);
    expect(spearman([1, 2], [1, 2])).toBeNaN();
  });
  it('within 1.5 points', () => expect(within([5, 6, 9, 2], [6.5, 8, 9, 2])).toBe(0.75));
  it('self-bias: a judge that adds a point to its own family shows +1', () => {
    const rows = [
      { coachFamily: 'claude', mine: 8, theirs: 7 }, { coachFamily: 'claude', mine: 6, theirs: 5 },
      { coachFamily: 'gemini', mine: 7, theirs: 7 }, { coachFamily: 'gemini', mine: 5, theirs: 5 },
    ];
    expect(selfBias(rows, 'claude')).toBeCloseTo(1);
    expect(selfBias(rows.map((r) => ({ ...r, mine: r.theirs })), 'claude')).toBeCloseTo(0);
  });
  it('shuffle: a mix, the same every time for one seed, nothing lost', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffled(xs, 7)).toEqual(shuffled(xs, 7));
    expect(shuffled(xs, 7)).not.toEqual(xs);
    expect([...shuffled(xs, 7)].sort((a, b) => a - b)).toEqual(xs);
  });
});

describe('the judge request', () => {
  const x = { ...fromCalibration(CALIBRATION[0]), reply: 'As Gemini I think 95 g to go.', good: 'Gives the gap in grams.' };
  it('is blind: model names in the reply are hidden', () => {
    expect(judgeMessage(x)).not.toMatch(/Gemini/);
    expect(judgeMessage(x)).toMatch(/\[AI\] I think 95 g/);
    expect(judgeMessage(x)).toMatch(/WHAT A GOOD ANSWER DOES/);
  });
  it('shows the judges what the look-ups returned, so claims made from them can be checked (Codex, PR #66)', () => {
    const t = { id: '15-creatine-web', factSheet: 'MEMORY …', messages: [{ role: 'user', text: 'is creatine safe for me?' }], reply: 'Yes: 3–5 g a day is well studied [1].', actions: [],
      lookups: ['web:creatine safety'], lookupResults: '### web (searched)\nCreatine at 3–5 g a day is safe for healthy adults.\nSources: [1] ISSN position stand' };
    const j = fromTranscript(t, 'tabc');
    expect(judgeMessage(j)).toMatch(/WHAT THE LOOK-UPS RETURNED[^]*3–5 g a day is safe[^]*ISSN position stand/);
    expect(judgeBody(j).systemInstruction!.parts[0].text).not.toMatch(/ISSN/); // the cached facts prefix stays the same per conversation
  });
  it('its schema fits Claude\'s strict mode (no plain-JSON fallback for judges)', () => {
    const r = toClaude('claude-opus-5-5', judgeBody(x), 'medium');
    expect((r.output_config?.format as any).schema.required).toContain('inventedNothing');
  });
  it('asks once more after an unreadable verdict, then scores with the caps', async () => {
    let n = 0;
    const dry = () => reply(n++ === 0 ? 'oops' : JSON.stringify(v(9, { invention: true })));
    const j = await judgeOne('claude-opus-5-5', x, { ledger: ledger(), purpose: 'p', dry });
    expect(n).toBe(2);
    expect(j.score).toBe(3);
  });
  it('gives up after two unreadable verdicts', async () => {
    await expect(judgeOne('gemini-4-argon', x, { ledger: ledger(), purpose: 'p', dry: () => reply('nope') })).rejects.toThrow(/not JSON/);
  });
});

describe('transcript fingerprint (Codex, PR #66)', () => {
  const t = { id: '05-x', run: 1, factSheet: 'Jonas, 82 kg', messages: [{ role: 'user', text: 'hi' }], reply: 'Hello.', actions: [], usd: 0.01, ms: 900 };
  it('changes when anything the judge sees changes', () => {
    expect(transcriptPrint({ ...t, reply: 'Hello!' })).not.toBe(transcriptPrint(t));
    expect(transcriptPrint({ ...t, factSheet: 'Jonas, 83 kg' })).not.toBe(transcriptPrint(t));
    expect(transcriptPrint({ ...t, actions: [{ type: 'log_food' }] })).not.toBe(transcriptPrint(t));
  });
  it('stays the same for what the judge never sees (cost, time)', () => {
    expect(transcriptPrint({ ...t, usd: 0.5, ms: 3000 })).toBe(transcriptPrint(t));
  });
});
