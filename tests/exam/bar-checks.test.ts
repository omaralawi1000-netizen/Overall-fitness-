import { describe, expect, it } from 'vitest';
import { barChecks, inventedDates, wrongWeekdays } from '../../exam/v2/run-case';
import { CASES } from '../../exam/v2/cases';

const turn = (say: string, extra: Record<string, unknown> = {}) => ({ tier: 'deep' as const, model: 'm', say, shown: { text: say, did: [], offers: [], refused: [] }, dropped: [], usd: 0, ms: 0, ...extra });
const failed = (say: string, i = 0, extra = {}) => barChecks(CASES[i], [turn(say, extra)]).filter((c) => !c.ok).map((c) => c.name);

describe('the Answer Bar checks in code', () => {
  it('passes a short clean answer', () => {
    expect(failed('Got it. Train before the shift, or move it to Friday?')).toEqual([]);
  });
  it('catches length, two questions, citations in the text and bad Danish', () => {
    expect(failed(Array(130).fill('word').join(' '))).toEqual(['rule 1: a text is at most 120 words']);
    expect(failed('Before or after? Or Friday?')).toEqual(['rule 1: at most one question']);
    expect(failed('Creatine is safe (Kreider et al., 2017).')).toEqual(['rule 11: no citation in the text']);
    expect(failed('Yes, per Helms 2014 that works.')).toEqual(['rule 11: no citation in the text']);
    expect(failed('Din plan har to heldagskroppe.')).toEqual(['rule 14: no known bad Danish']);
    // round 3 (8 Nov)
    for (const da of ['Spis din sidste rigtige måltid ved 11.', 'Når er der indvejning?', 'Er det en skarp smerte eller mere en øm hvis?', 'Går det samme knæ, som det var i foråret?', 'Det data viser: intet er logget.', 'Læg vægt på, når teknikken holder.', 'Squat, mavebøjninger og lunges.', 'Tag et lille snack før.', 'Noget du har tåle før.'])
      expect(failed(da)).toEqual(['rule 14: no known bad Danish']);
    for (const da of ['Spis dit sidste rigtige måltid ved 11.', 'Hvornår er indvejningen?', 'Når du har vejet ind, så spis.', 'Øg vægten, når teknikken sidder.', 'Dataene viser fremgang.'])
      expect(failed(da)).toEqual([]);
    expect(failed('Creatine 3–5 g a day is fine, and 2026 is a good year.')).toEqual([]);
    expect(failed('Your goal date is 28 February 2027.')).not.toContain('rule 11: no citation in the text');
  });
  it('an expert request may run to 250 words, a text only to 120', () => {
    const e = CASES.findIndex((c) => c.mode === 'expert' && c.turns[0].expert);
    expect(e).toBeGreaterThanOrEqual(0);
    expect(failed(Array(200).fill('word').join(' '), e)).toEqual([]);
    expect(failed(Array(260).fill('word').join(' '), e)).toEqual(['rule 2: an expert answer is at most 250 words']);
  });
  it('voice: no lists or symbols, under 60 words', () => {
    const v = CASES.findIndex((c) => c.turns[0].voice);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(failed('- Bench: 80 kg × 8', v)).toContain('rule 3: voice is spoken style');
    expect(failed('Logged: eighty kilos for eight.', v)).toEqual([]);
  });
  it('a date the facts never had is invented; one they had is not', () => {
    expect(inventedDates('You reach 83 kg around 12 December, well ahead of 28 February.', 'goal by 2027-02-28')).toEqual(['12 December']);
    expect(inventedDates('Pull moves to Fri 6 Nov.', '- 2026-11-06 (Friday): Pull')).toEqual([]);
    expect(inventedDates('kampen 7. november', '2026-11-07')).toEqual([]);
  });
  it('catches a weekday that is not its date (4 Nov: Saturday 31 October called "mandag")', () => {
    expect(wrongWeekdays('Dit sidste pas var mandag den 31. oktober...', '2026-11-03')).toEqual(['mandag den 31. oktober']);
    expect(wrongWeekdays('Sidste pas: lørdag den 31. oktober.', '2026-11-03')).toEqual([]);
    expect(wrongWeekdays('Race day is Sunday, November 8.', '2026-11-02')).toEqual([]);
    expect(wrongWeekdays('Race day is Monday 8 November.', '2026-11-02')).toEqual(['Monday 8 November']);
    expect(wrongWeekdays('See you Monday the 2nd of November', '2026-11-01')).toEqual([]);
    // across the new year: early January is read in the coming year
    expect(wrongWeekdays('torsdag den 1. januar', '2026-12-20')).toEqual(['torsdag den 1. januar']);
    expect(wrongWeekdays('fredag den 1. januar', '2026-12-20')).toEqual([]);
    // a year that is said wins over the nearest one (Codex, PR #83)
    expect(wrongWeekdays('Thursday 1 January 2026', '2026-11-03')).toEqual([]);
    expect(wrongWeekdays('Friday 1 January 2026', '2026-11-03')).toEqual(['Friday 1 January 2026']);
    expect(wrongWeekdays('Sunday, November 8th, 2026', '2026-11-02')).toEqual([]);
    expect(wrongWeekdays('Sunday, November 8th', '2026-11-02')).toEqual([]);
    expect(wrongWeekdays('Saturday, November 8th', '2026-11-02')).toEqual(['Saturday, November 8th']);
    expect(wrongWeekdays('Thursday 1 January', '2026-01-03')).toEqual([]);
    const fails = barChecks(CASES[0], [turn('Moved to Monday 8 November.')]).filter((c) => !c.ok).map((c) => c.name);
    expect(fails).toContain('rule 4: a weekday matches its date');
  });
});
