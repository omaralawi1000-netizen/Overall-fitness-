// Property tests: the rules hold for thousands of made-up phrases, not just the ones written by hand.
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { understand, parseSetCommand, parseFood, readWater, show } from '../../src/engine/parse';

const open = { workoutOpen: true };
const reps = fc.integer({ min: 1, max: 30 });
const kg = fc.integer({ min: 4, max: 600 }).map((x) => x / 2); // 2 … 300 in halves
const fmt = (x: number) => String(x);

describe('it never crashes and always has something to say', () => {
  it('any text at all', () => {
    fc.assert(fc.property(fc.string({ maxLength: 120 }), fc.boolean(), (t, wo) => {
      const r = understand(t, { workoutOpen: wo });
      expect(typeof r.kind).toBe('string');
      expect(typeof show(r)).toBe('string');
      expect(show(r).length).toBeGreaterThan(0);
    }), { numRuns: 1500 });
  });
  it('the same text gives the same reading, in any case and with extra spaces', () => {
    const phrase = fc.tuple(reps, kg).map(([r, k]) => `${r} at ${fmt(k)}`);
    fc.assert(fc.property(phrase, (t) => {
      const a = understand(t, open);
      expect(understand(t, open)).toEqual(a);
      expect(understand(`  ${t.toUpperCase()}  `, open)).toEqual(a);
    }));
  });
});

describe('talking logs nothing', () => {
  // ordinary words with no digit, no number word, no unit, no cue word
  const WORDS = ['hello', 'there', 'can', 'you', 'pass', 'the', 'towel', 'please', 'hvad', 'sker', 'der', 'tak', 'lets', 'go', 'home', 'later', 'thanks', 'ok', 'cool', 'really', 'maybe', 'tomorrow', 'coffee', 'friend', 'music', 'louder'];
  const talk = fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 8 }).map((w) => w.join(' '));
  it('words with no number in them are never read as anything to log', () => {
    fc.assert(fc.property(talk, fc.boolean(), (t, wo) => {
      const r = understand(t, { workoutOpen: wo });
      expect(['ignored', 'ask']).toContain(r.kind);
    }), { numRuns: 1000 });
  });
  it('a long sentence with a number in it is not a set', () => {
    fc.assert(fc.property(talk, reps, (t, n) => {
      const sentence = `${t} and then ${t} about ${n} ${t}`;
      const r = understand(sentence, open);
      expect(r.kind === 'command').toBe(false);
    }));
  });
});

describe('undo is only ever asked for', () => {
  it('no other phrase is read as undo', () => {
    fc.assert(fc.property(fc.string({ maxLength: 60 }), (t) => {
      const r = parseSetCommand(t);
      if (r?.kind === 'undo') expect(/undo|fortryd|annuller/i.test(t)).toBe(true);
    }), { numRuns: 2000 });
  });
  it('a "no" in a phrase never undoes it', () => {
    fc.assert(fc.property(reps, kg, reps, (r1, k1, r2) => {
      const r = parseSetCommand(`${r1} at ${fmt(k1)}, no ${r2} reps`);
      expect(r?.kind).not.toBe('undo');
    }));
  });
});

describe('the rules for a set', () => {
  it('reps at weight reads back exactly', () => {
    fc.assert(fc.property(reps, kg, (r, k) => {
      expect(parseSetCommand(`${r} at ${fmt(k)}`)).toEqual({ kind: 'set', reps: r, kg: k });
      expect(parseSetCommand(`${fmt(k)} for ${r}`)).toEqual({ kind: 'set', kg: k, reps: r });
    }));
  });
  it('pounds are stored as kilos to two places and kept as said', () => {
    fc.assert(fc.property(reps, fc.integer({ min: 10, max: 700 }), (r, lb) => {
      const c = parseSetCommand(`${r} at ${lb} lb`);
      expect(c).toMatchObject({ kind: 'set', reps: r, entered: { value: lb, unit: 'lb' } });
      if (c?.kind === 'set') expect(Math.abs(c.kg! - lb * 0.45359237)).toBeLessThan(0.006);
    }));
  });
  it('a whole second set replaces the first one', () => {
    fc.assert(fc.property(reps, kg, reps, kg, (r1, k1, r2, k2) => {
      expect(parseSetCommand(`${r1} at ${fmt(k1)}, no ${r2} at ${fmt(k2)}`)).toEqual({ kind: 'set', reps: r2, kg: k2 });
    }));
  });
  it('a named weight keeps the reps; a named rep count keeps the weight', () => {
    fc.assert(fc.property(reps, kg, kg, reps, (r1, k1, k2, r2) => {
      expect(parseSetCommand(`${r1} at ${fmt(k1)}, no ${fmt(k2)} kilos`)).toEqual({ kind: 'set', reps: r1, kg: k2 });
      expect(parseSetCommand(`${r1} at ${fmt(k1)}, no ${r2} reps`)).toEqual({ kind: 'set', reps: r2, kg: k1 });
    }));
  });
  it('a bare number against reps and kilos always asks, with two different readings', () => {
    fc.assert(fc.property(reps, kg, fc.integer({ min: 1, max: 29 }), (r1, k1, n) => {
      const c = parseSetCommand(`${r1} at ${fmt(k1)}, no ${n}`);
      expect(c?.kind).toBe('ask');
      if (c?.kind === 'ask') {
        expect(c.options).toHaveLength(2);
        expect(c.options![0]).not.toEqual(c.options![1]);
      }
    }));
  });
});

describe('food and water read back exactly', () => {
  it('grams', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 5000 }), fc.constantFrom('skyr', 'oats', 'chicken breast'), (n, f) => {
      expect(parseFood(`${n} grams of ${f}`).rows).toMatchObject([{ amount: n, dim: 'g', query: f }]);
    }));
  });
  it('decimal commas, as dictated in Danish', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 30 }), fc.integer({ min: 0, max: 9 }), (a, b) => {
      expect(parseFood(`${a},${b} dl mælk`).rows[0]).toMatchObject({ dim: 'ml', amount: Math.round((a + b / 10) * 100 * 1000) / 1000 });
    }));
  });
  it('water in ml', () => {
    fc.assert(fc.property(fc.integer({ min: 10, max: 5000 }), (ml) => {
      expect(readWater(`${ml} ml water`)).toEqual({ ml });
    }));
  });
  it('a food row is never made without an amount', () => {
    fc.assert(fc.property(fc.constantFrom('skyr', 'banana', 'rugbrød', 'protein bar'), (f) => {
      expect(parseFood(f).rows).toEqual([]);
    }));
  });
});

describe('no phrase can freeze the page', () => {
  it('long runs of digits, separators and set words stay fast', () => {
    const piece = fc.constantFrom('8', '80', '1', ' ', ', ', ',', ' and ', ' x ', ' for ', ' at ', ' kg', ' reps', '.', 'bench ', 'no ', 'sets ');
    fc.assert(fc.property(fc.array(piece, { minLength: 20, maxLength: 150 }).map((a) => a.join('')), fc.boolean(), (t, wo) => {
      const t0 = performance.now();
      understand(t, { workoutOpen: wo });
      expect(performance.now() - t0).toBeLessThan(500); // a real blowup takes seconds; this only guards against a loaded machine
    }), { numRuns: 600 });
  });
});
