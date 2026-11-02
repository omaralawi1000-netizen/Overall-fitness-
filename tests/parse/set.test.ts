// Hands-free sets. Ported from old Aven's handsfree/corrections tests, with the three changed rules:
// a "no" inside a phrase is a correction, a lone "no" asks, and pounds are understood.
import { describe, it, expect } from 'vitest';
import { parseSetCommand as p, guardSet, fixMisheard } from '../../src/engine/parse';

describe('reading a set', () => {
  it('reps at weight, weight for reps, in both languages', () => {
    expect(p('8 at 80')).toEqual({ kind: 'set', reps: 8, kg: 80 });
    expect(p('8 reps at 82.5 kilos')).toEqual({ kind: 'set', reps: 8, kg: 82.5 });
    expect(p('80 for 8')).toEqual({ kind: 'set', kg: 80, reps: 8 });
    expect(p('80 kg 8 reps')).toEqual({ kind: 'set', kg: 80, reps: 8 });
    expect(p('Eight at eighty.')).toEqual({ kind: 'set', reps: 8, kg: 80 });
    expect(p('eighty two and a half for six')).toEqual({ kind: 'set', kg: 82.5, reps: 6 });
    expect(p('otte på firs')).toEqual({ kind: 'set', reps: 8, kg: 80 });
    expect(p('8 på 80')).toEqual({ kind: 'set', reps: 8, kg: 80 });
    expect(p('otte gange på 62,5 kilo')).toEqual({ kind: 'set', reps: 8, kg: 62.5 });
    expect(p('62 og en halv til 8')).toEqual({ kind: 'set', kg: 62.5, reps: 8 });
    expect(p('Uh, that was 9.')).toEqual({ kind: 'set', reps: 9 });
    expect(p('10 reps')).toEqual({ kind: 'set', reps: 10 });
    expect(p('to gange')).toEqual({ kind: 'set', reps: 2 });
    expect(p('82.5 kilos')).toEqual({ kind: 'set', kg: 82.5 });
  });
  it('pounds are kept as said, and stored as kilos', () => {
    expect(p('180 lb for 5')).toEqual({ kind: 'set', kg: 81.65, reps: 5, entered: { value: 180, unit: 'lb' } });
    expect(p('5 reps at 135 pounds')).toEqual({ kind: 'set', kg: 61.23, reps: 5, entered: { value: 135, unit: 'lb' } });
  });
  it('same again, done, skip, rest, undo', () => {
    expect(p('Same again')).toEqual({ kind: 'same' });
    expect(p('samme igen')).toEqual({ kind: 'same' });
    expect(p('done')).toEqual({ kind: 'done' });
    expect(p('færdig')).toEqual({ kind: 'done' });
    expect(p('skip this set')).toEqual({ kind: 'skip' });
    expect(p('spring over')).toEqual({ kind: 'skip' });
    expect(p('+15 seconds')).toEqual({ kind: 'rest', sec: 15 });
    expect(p('30 sekunder mere')).toEqual({ kind: 'rest', sec: 30 });
    expect(p('one minute more')).toEqual({ kind: 'rest', sec: 60 });
    expect(p('undo')).toEqual({ kind: 'undo' });
    expect(p('fortryd')).toEqual({ kind: 'undo' });
    expect(p('undo that')).toEqual({ kind: 'undo' });
  });
  it('anything else is ignored, never guessed', () => {
    for (const s of ['hello there', 'can you spot me', 'I did 8 at 80 yesterday with my friend and it was hard', 'hvad så', 'the 8 bus', 'what time is it', '', 'mm', 'no problem', 'no thanks']) expect(p(s)).toBeNull();
    expect(p('8.5')).toBeNull(); // half a rep
  });
});

describe('"no" is a correction inside a phrase and a question on its own', () => {
  it('a bare "no" is no longer undo: it asks', () => {
    expect(p('no')).toEqual({ kind: 'ask', why: 'bareNo' });
    expect(p('Nej.')).toEqual({ kind: 'ask', why: 'bareNo' });
  });
  it('"80… no, 60" is 60', () => {
    expect(p('80, no 60')).toEqual({ kind: 'set', reps: 60 });
    expect(p('8 at 80, no, 8 at 60')).toEqual({ kind: 'set', reps: 8, kg: 60 });
    expect(p('8 på 80, nej 60 kilo')).toEqual({ kind: 'set', reps: 8, kg: 60 });
    expect(p('8 at 80 no I mean 8 at 85')).toEqual({ kind: 'set', reps: 8, kg: 85 });
  });
  it('a named part replaces only that part', () => {
    expect(p('8 at 80, no 9 reps')).toEqual({ kind: 'set', reps: 9, kg: 80 });
    expect(p('8 at 80, no 82.5 kilos')).toEqual({ kind: 'set', reps: 8, kg: 82.5 });
    expect(p('8 at 135 lb, no 140 lb')).toEqual({ kind: 'set', reps: 8, kg: 63.5, entered: { value: 140, unit: 'lb' } });
  });
  it('a bare number against reps AND kilos asks, with both readings', () => {
    expect(p('8 at 80, no 85')).toEqual({
      kind: 'ask', why: 'which',
      options: [{ kind: 'set', kg: 85, reps: 8 }, { kind: 'set', kg: 80, reps: 85 }],
    });
  });
  it('the last "no" wins', () => {
    expect(p('8 at 80, no 9 reps, no 10 reps')).toEqual({ kind: 'set', reps: 10, kg: 80 });
  });
  it('nothing to take back, or nothing new: asks, never logs', () => {
    expect(p('no 60')).toEqual({ kind: 'ask', why: 'correction', options: [{ kind: 'set', reps: 60 }] });
    expect(p('8 at 80, no')).toEqual({ kind: 'ask', why: 'correction' });
    expect(p('hello there, no 60')).toEqual({ kind: 'ask', why: 'correction', options: [{ kind: 'set', reps: 60 }] });
    expect(p('8 at 80, no thanks')).toEqual({ kind: 'ask', why: 'correction' });
  });
  it('"no, skip" is skip', () => {
    expect(p('8 at 80, no skip')).toEqual({ kind: 'skip' });
  });
  it('a word that only contains "no" is not a correction', () => {
    expect(p('nothing')).toBeNull();
    expect(p('8 at 80 know')).toBeNull();
  });
});

describe('a number far off is asked about, not logged', () => {
  it('a dropped digit', () => {
    expect(guardSet({ kg: 18, reps: 8 }, { kg: 80, reps: 8 })).toEqual({ kg: [18, 80] });
    expect(guardSet({ kg: 8 }, { kg: 80 })).toEqual({ kg: [8, 80] });
    expect(guardSet({ kg: 82.5, reps: 8 }, { kg: 80, reps: 8 })).toBeNull();
    expect(guardSet({ reps: 80 }, { kg: 80, reps: 8 })).toEqual({ reps: [80, 8] });
    expect(guardSet({ kg: 60 }, {})).toBeNull();
  });
});

describe('a misheard number is fixed only for the slips speech really makes', () => {
  it('18 → 80, 8 → 80, 800 → 80 when 80 is the usual', () => {
    expect(fixMisheard({ kg: 18 }, { kg: 80 })).toMatchObject({ kg: 80, heard: { kg: 18 } });
    expect(fixMisheard({ kg: 8 }, { kg: 80 })).toMatchObject({ kg: 80, heard: { kg: 8 } });
    expect(fixMisheard({ kg: 800 }, { kg: 80 })).toMatchObject({ kg: 80, heard: { kg: 800 } });
  });
  it('a real deload and a normal number stay as said', () => {
    expect(fixMisheard({ kg: 60 }, { kg: 80 }).kg).toBe(60);
    expect(fixMisheard({ kg: 82.5 }, { kg: 80 }).heard).toBeUndefined();
    expect(fixMisheard({ kg: 18 }, {}).kg).toBe(18);
  });
  it('reps: 80 → 8', () => {
    expect(fixMisheard({ reps: 80 }, { reps: 8 })).toMatchObject({ reps: 8, heard: { reps: 80 } });
  });
});

describe('Codex review of #51: one notation, one meaning', () => {
  it('"80 x 8" with no unit asks which; a unit settles it', () => {
    expect(p('80 x 8')).toMatchObject({ kind: 'ask', why: 'which', options: [{ kind: 'set', kg: 80, reps: 8 }, { kind: 'set', reps: 80, kg: 8 }] });
    expect(p('80.5 x 8')).toMatchObject({ kind: 'ask', why: 'which' });
    expect(p('80 kg x 8')).toEqual({ kind: 'set', kg: 80, reps: 8 });
    expect(p('8 x 80 kg')).toEqual({ kind: 'set', reps: 8, kg: 80 });
  });
  it('an undo inside a correction never undoes', () => {
    expect(p('8 at 80, no undo')).toEqual({ kind: 'ask', why: 'correction' });
    expect(p('undo')).toEqual({ kind: 'undo' });
  });
  it('fractional reps are refused in the labelled forms too', () => {
    expect(p('80 kg 8.5 reps')).toBeNull();
    expect(p('8.5 reps 80 kg')).toBeNull();
    expect(p('80 kg 8 reps')).toEqual({ kind: 'set', kg: 80, reps: 8 });
  });
});

describe('Codex review of #51, round 5', () => {
  it('reps are only corrected with something to go by', () => {
    expect(fixMisheard({ reps: 80 }, {})).toEqual({ kg: undefined, reps: 80 });
    expect(fixMisheard({ reps: 80 }, { kg: 80 }).reps).toBe(80);
    expect(fixMisheard({ reps: 80 }, { reps: 8 })).toMatchObject({ reps: 8, heard: { reps: 80 } });
  });
});
