// The router: which reading a phrase gets, and the rule that nothing uncertain is ever read as a log.
import { describe, it, expect } from 'vitest';
import { understand as u, understand, show } from '../../src/engine/parse';

const open = { workoutOpen: true };
const closed = { workoutOpen: false };

describe('routing', () => {
  it('a set only counts with a workout open', () => {
    expect(u('8 at 80', open)).toMatchObject({ kind: 'command', cmd: { kind: 'set', reps: 8, kg: 80 } });
    expect(u('8 at 80', closed)).toEqual({ kind: 'ignored', reason: 'noWorkoutOpen' });
    expect(u('same again', closed)).toEqual({ kind: 'ignored', reason: 'noWorkoutOpen' });
  });
  it('undo works with or without a workout', () => {
    expect(u('undo', closed)).toEqual({ kind: 'command', cmd: { kind: 'undo' } });
    expect(u('fortryd', open)).toEqual({ kind: 'command', cmd: { kind: 'undo' } });
  });
  it('a bare number is a set, a weight needs its word', () => {
    expect(u('8', open)).toMatchObject({ kind: 'command', cmd: { kind: 'set', reps: 8 } });
    expect(u('82.5', open)).toEqual({ kind: 'ignored', reason: 'notLoggable' }); // half a rep: not a set, and not a weight without its word
    expect(u('82.5 kilos', open)).toMatchObject({ kind: 'command', cmd: { kind: 'set', kg: 82.5 } });
  });
  it('water, bodyweight and food each get their own reading', () => {
    expect(u('500 ml water', closed)).toMatchObject({ kind: 'water', ml: 500 });
    expect(u('I weigh 82,5 kg', closed)).toMatchObject({ kind: 'bodyweight', kg: 82.5 });
    expect(u('200 grams of skyr and 60 grams of oats', closed)).toMatchObject({ kind: 'food' });
  });
  it('an exercise with sets is a workout reading', () => {
    expect(u('bench press 80 kilos for 8, 8 and 6', closed)).toMatchObject({ kind: 'workout', rows: [{ exercise: { name: 'Barbell Bench Press' } }] });
  });
  it('a meal word and an "I ate" count', () => {
    expect(u('I had 2 eggs for breakfast', closed)).toMatchObject({ kind: 'food', meal: 'breakfast' });
    expect(u('a banana', closed)).toEqual({ kind: 'ignored', reason: 'notLoggable' });
    expect(u('I ate a banana', closed)).toMatchObject({ kind: 'food' });
  });
});

describe('talking to someone else logs nothing', () => {
  const talk = [
    'hello there', 'can you spot me', 'I did 8 at 80 yesterday with my friend and it was hard', 'hvad så', 'the 8 bus',
    'what time is it', 'mm', 'no problem', 'a dog and a cat', 'I have two kids', 'see you at 8', 'it costs 80 kroner',
    'call me in 10 minutes', 'water is good for you', 'my weight loss plan', 'I like bench press', 'how heavy is 80 kg',
  ];
  for (const t of talk) {
    it(JSON.stringify(t), () => {
      for (const ctx of [open, closed]) {
        const r = u(t, ctx);
        expect(['ignored', 'ask']).toContain(r.kind);
      }
    });
  }
});

describe('unsure means ask', () => {
  it('a bare no', () => expect(u('no', open)).toMatchObject({ kind: 'ask', why: 'bareNo' }));
  it('8 at 80, no 85', () => expect(u('8 at 80, no 85', open)).toMatchObject({ kind: 'ask', why: 'which', options: [{ kind: 'command' }, { kind: 'command' }] }));
  it('a weight that cannot be a body', () => expect(u('I weigh 12', open)).toMatchObject({ kind: 'ask', why: 'range' }));
  it('half of a food phrase read', () => {
    const r = u('200 grams of skyr and some stuff', closed);
    expect(r).toMatchObject({ kind: 'ask', why: 'partial', unread: ['some stuff'], options: [{ kind: 'food' }] });
  });
  it('two exercises that match equally', () => {
    const r = u('curl 20 for 8', closed);
    expect(['workout', 'ask']).toContain(r.kind);
  });
});

describe('show() always gives a sentence', () => {
  it('for every kind', () => {
    for (const t of ['8 at 80', 'no', 'undo', '500 ml water', 'I weigh 80', 'bench 80 for 8', '2 eggs', 'hello', '', '200 grams skyr and stuff']) {
      expect(show(u(t, open)).length).toBeGreaterThan(3);
    }
  });
});

describe('very long text', () => {
  it('is ignored fast instead of read', () => {
    const t0 = performance.now();
    expect(understand('bench ' + '1'.repeat(5000), { workoutOpen: true })).toEqual({ kind: 'ignored', reason: 'notLoggable' });
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('Codex review of #51, round 4', () => {
  it('a full stop at the end changes nothing', () => {
    expect(understand('I had 2 eggs for breakfast.')).toMatchObject({ kind: 'food', meal: 'breakfast', rows: [{ query: 'eggs' }] });
    expect(understand('a banana for breakfast.')).toMatchObject({ kind: 'food', meal: 'breakfast' });
  });
  it('an exercise named with a number word is logged by name', () => {
    expect(understand('One-arm Dumbbell Row 20 kg for 10')).toMatchObject({ kind: 'workout', rows: [{ exercise: { name: 'One-arm Dumbbell Row' } }] });
  });
});
