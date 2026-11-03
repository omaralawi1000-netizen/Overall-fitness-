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

// Codex's retro-review of #51, #54 and #58 (3 Nov 2026): each finding, reproduced on main, now a test.
describe('Codex retro-review findings', () => {
  it('a leading decimal point is kept: ".5" is half, never 5', () => {
    expect(u('.5 l water', closed)).toMatchObject({ kind: 'water', ml: 500 });
    expect(u('.5 kg for 8', open)).toMatchObject({ kind: 'command', cmd: { kind: 'set', kg: 0.5, reps: 8 } });
    expect(u('uh .5 liter vand', closed)).toMatchObject({ kind: 'water', ml: 500 });
  });
  it('a bare decimal correction keeps the unit the set was said in', () => {
    const c = u('180 lb for 5 no 185.5', open);
    expect(c).toMatchObject({ kind: 'command', cmd: { kind: 'set', reps: 5, entered: { value: 185.5, unit: 'lb' } } });
    if (c.kind === 'command' && c.cmd.kind === 'set') expect(c.cmd.kg).toBeCloseTo(185.5 * 0.45359237, 2);
  });
  it('two exercises joined by "and" stay two exercises', () => {
    expect(u('squat 100 for 5 and front squat 80 for 5', closed)).toMatchObject({ kind: 'workout', rows: [
      { exercise: { name: 'Back Squat' }, row: { sets: [{ kg: 100, reps: 5 }] } },
      { exercise: { name: 'Front Squat' }, row: { sets: [{ kg: 80, reps: 5 }] } },
    ] });
    expect(u('bench press 80 for 8 and dumbbell bench press 25 for 10', closed)).toMatchObject({ kind: 'workout', rows: [
      { exercise: { name: 'Barbell Bench Press' }, row: { sets: [{ kg: 80, reps: 8 }] } },
      { exercise: { name: 'Dumbbell Bench Press' }, row: { sets: [{ kg: 25, reps: 10 }] } },
    ] });
    // more reps of the same exercise still join it
    expect(u('bench press 80 for 8, 8 and 6', closed)).toMatchObject({ kind: 'workout', rows: [{ row: { sets: [{ reps: 8 }, { reps: 8 }, { reps: 6 }] } }] });
    // a connector inside one distance-and-time set does not start a new exercise or set (Codex on #64)
    for (const t of ['run 5 km, in 25 minutes', 'run 5 km and in 25 minutes', 'løb 5 km på 25 minutter'])
      expect(u(t, closed)).toMatchObject({ kind: 'workout', rows: [{ row: { sets: [{ distanceM: 5000, durationSec: 1500 }] } }] });
  });
  it('making, getting or buying something is not eating it', () => {
    for (const t of ['I made 2 sandwiches', 'I got 2 dogs', 'i bought 6 eggs', 'jeg købte 2 bananer', 'I made 3 pizzas for the kids']) {
      expect(['ignored', 'ask']).toContain(u(t, closed).kind);
    }
    expect(u('i did 8 at 80', open)).toMatchObject({ kind: 'command', cmd: { kind: 'set', reps: 8, kg: 80 } }); // a lead-in before a set still goes
    expect(u('I had 2 sandwiches', closed)).toMatchObject({ kind: 'food', rows: [{ amount: 2, query: 'sandwiches' }] });
  });
  it('a food name with a word that is also a sentence word in the other language is still food', () => {
    expect(u('jeg spiste 100 g is', closed)).toMatchObject({ kind: 'food', rows: [{ amount: 100, dim: 'g', query: 'is' }] });
    expect(u('200 g kylling i karry', closed)).toMatchObject({ kind: 'food', rows: [{ amount: 200, dim: 'g', query: 'kylling i karry' }] });
    expect(u('100 g dulce de leche', closed)).toMatchObject({ kind: 'food', rows: [{ amount: 100, query: 'dulce de leche' }] });
    expect(u('150 g is med jordbær', closed)).toMatchObject({ kind: 'food', rows: [{ amount: 150, query: 'is med jordbær' }] });
    // still talk: a clause after the amount
    for (const t of ['27 people are in the gym', 'I have two kids', '2 eggs i think', 'jeg har 3 timer i skole', '2 bananer de er gode', '2 eggs is all i had', '2 eggs i cooked', '2 is enough', '3 eggs i made earlier', '2 is plenty', '2 æg de smager godt', '2 bananer de kostede meget']) {
      expect(['ignored', 'ask']).toContain(u(t, closed).kind);
    }
  });
});
