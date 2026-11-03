// The exam's number audit: numbers in a reply that are nowhere in the Coach's facts.
import { describe, it, expect } from 'vitest';
import { unsourcedNumbers } from '../../exam/checks/numbers';

const FACTS = 'Target 2600 kcal and 215 g protein. Weigh-ins: 88.0 (2026-11-01), 87.6 (2026-10-29). Today: 120 g protein, 1,500 kcal.';

describe('number audit', () => {
  it('finds a number that is not in the facts', () => expect(unsourcedNumbers('You weighed 86.4 kg on Tuesday.', FACTS)).toEqual(['86.4']));
  it('accepts numbers written another way (2,600 / 2.600 / 87,6 / 1500)', () => {
    expect(unsourcedNumbers('Mål: 2.600 kcal, du vejede 87,6 og har spist 1500 kcal.', FACTS)).toEqual([]);
    expect(unsourcedNumbers('2,600 kcal and 215 g.', FACTS)).toEqual([]);
  });
  it('flags a sum as a lead (judges decide), each number once', () => expect(unsourcedNumbers('95 g to go, 95 g left.', FACTS)).toEqual(['95']));
  it('leaves out small counts and parts of dates in the facts', () => expect(unsourcedNumbers('Have 2 eggs and 3 sets; next weigh-in after the 29th, by 01 Nov.', FACTS)).toEqual([]));
});
