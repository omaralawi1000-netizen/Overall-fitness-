import { describe, expect, it } from 'vitest';
import { barChecks, inventedDates } from '../../exam/v2/run-case';
import { CASES } from '../../exam/v2/cases';

const turn = (say: string, extra: Record<string, unknown> = {}) => ({ tier: 'deep' as const, model: 'm', say, shown: { text: say, did: [], offers: [], refused: [] }, dropped: [], usd: 0, ms: 0, ...extra });
const failed = (say: string, i = 0, extra = {}) => barChecks(CASES[i], [turn(say, extra)]).filter((c) => !c.ok).map((c) => c.name);

describe('the Answer Bar checks in code', () => {
  it('passes a short clean answer', () => {
    expect(failed('Got it. Train before the shift, or move it to Friday?')).toEqual([]);
  });
  it('catches length, two questions, citations in the text and bad Danish', () => {
    expect(failed(Array(130).fill('word').join(' '))).toEqual(['rule 1: at most 120 words']);
    expect(failed('Before or after? Or Friday?')).toEqual(['rule 1: at most one question']);
    expect(failed('Creatine is safe (Kreider et al., 2017).')).toEqual(['rule 9: no citation in the text']);
    expect(failed('Yes, per Helms 2014 that works.')).toEqual(['rule 9: no citation in the text']);
    expect(failed('Din plan har to heldagskroppe.')).toEqual(['rule 12: no known bad Danish']);
    expect(failed('Creatine 3–5 g a day is fine, and 2026 is a good year.')).toEqual([]);
    expect(failed('Your goal date is 28 February 2027.')).not.toContain('rule 9: no citation in the text');
  });
  it('voice: no lists or symbols, under 60 words', () => {
    const v = CASES.findIndex((c) => c.turns[0].voice);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(failed('- Bench: 80 kg × 8', v)).toContain('rule 2: voice is spoken style');
    expect(failed('Logged: eighty kilos for eight.', v)).toEqual([]);
  });
  it('a date the facts never had is invented; one they had is not', () => {
    expect(inventedDates('You reach 83 kg around 12 December, well ahead of 28 February.', 'goal by 2027-02-28')).toEqual(['12 December']);
    expect(inventedDates('Pull moves to Fri 6 Nov.', '- 2026-11-06 (Friday): Pull')).toEqual([]);
    expect(inventedDates('kampen 7. november', '2026-11-07')).toEqual([]);
  });
});
