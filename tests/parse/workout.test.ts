import { describe, it, expect } from 'vitest';
import { parseWorkoutText, matchExercises } from '../../src/engine/parse';

const sets = (t: string) => parseWorkoutText(t).rows[0].sets.map((s) => [s.kg, s.reps]);

describe('workout phrases', () => {
  it('several reps at one weight', () => {
    expect(sets('bench press 80 kilos for 8, 8 and 6')).toEqual([[80, 8], [80, 8], [80, 6]]);
  });
  it('weight x reps x sets', () => {
    expect(sets('squat 100 x 5 x 3')).toEqual([[100, 5], [100, 5], [100, 5]]);
  });
  it('3 sets of 8 at 80', () => {
    expect(sets('3 sets of 8 at 80 kg bench press')).toEqual([[80, 8], [80, 8], [80, 8]]);
    expect(sets('squat 3 sæt af 8 med 80 kilo')).toEqual([[80, 8], [80, 8], [80, 8]]);
  });
  it('time and distance', () => {
    const r = parseWorkoutText('plank 60 seconds then run 5 km in 25 minutes').rows;
    expect(r[0]).toMatchObject({ query: 'plank', sets: [{ durationSec: 60 }] });
    expect(r[1]).toMatchObject({ query: 'run', sets: [{ distanceM: 5000, durationSec: 1500 }] });
  });
  it('pounds are kept as said', () => {
    expect(parseWorkoutText('bench 135 lb for 5').rows[0].sets[0]).toEqual({ kg: 61.23, reps: 5, entered: { value: 135, unit: 'lb' } });
  });
  it('sets with no exercise, or an exercise with no sets, are not a phrase', () => {
    expect(parseWorkoutText('bench press').rows).toEqual([]);
    expect(parseWorkoutText('80 for 8').rows).toEqual([]);
  });
  it('at most 12 sets from one "x"', () => {
    expect(sets('squat 100 x 5 x 99')).toHaveLength(12);
  });
});

describe('finding the exercise', () => {
  const best = (q: string) => matchExercises(q)[0]?.exercise.name;
  it('gym names land on the lift people mean', () => {
    expect(best('bench')).toBe('Barbell Bench Press');
    expect(best('squat')).toBe('Back Squat');
    expect(best('rdl')).toBe('Romanian Deadlift');
    expect(best('pull ups')).toBe('Pull-up');
  });
  it('nothing like it, nothing found', () => {
    expect(matchExercises('quantum banana')).toEqual([]);
  });
});

describe('Codex review of #51', () => {
  it('a second set with its own weight is not read as more reps', () => {
    expect(parseWorkoutText('bench press 80 for 8 and 60 for 10').rows).toEqual([]);
    expect(sets('bench press 80 for 8, 8 and 6')).toEqual([[80, 8], [80, 8], [80, 6]]);
  });
  it('durations and distances use whole units', () => {
    expect(parseWorkoutText('plank 1 minute').rows[0]).toMatchObject({ query: 'plank', sets: [{ durationSec: 60 }] });
    expect(parseWorkoutText('run 1 mile').rows[0]).toMatchObject({ query: 'run', sets: [{ distanceM: 1609.344 }] });
    expect(parseWorkoutText('run 400 m').rows[0].sets[0].distanceM).toBe(400);
  });
  it('letters in an exercise name stay: "extension" keeps its x', () => {
    expect(parseWorkoutText('leg extension 40 for 10').rows[0].query).toBe('leg extension');
    expect(parseWorkoutText('back extension 10 reps').rows[0].query).toBe('back extension');
  });
  it('"bench 80 x 8" with no unit is not guessed', () => {
    expect(parseWorkoutText('bench 80 x 8').rows).toEqual([]);
    expect(sets('bench 80 kg x 8')).toEqual([[80, 8]]);
  });
});

describe('Codex review of #51, round 2', () => {
  it('a long run of digits cannot freeze the parser', () => {
    for (const n of [30, 60, 500]) {
      const t0 = performance.now();
      parseWorkoutText(`bench ${'1'.repeat(n)}`);
      parseWorkoutText(`bench ${'8 '.repeat(n)}reps`);
      expect(performance.now() - t0).toBeLessThan(200);
    }
  });
  it('rep counts are separated: 8, 8 and 6 reps at 80', () => {
    expect(sets('bench 8, 8 and 6 reps at 80 kg')).toEqual([[80, 8], [80, 8], [80, 6]]);
    expect(sets('bench 8 8 6 reps at 80 kg')).toEqual([[80, 8], [80, 8], [80, 6]]);
  });
});

describe('Codex review of #51, round 4', () => {
  it('number words inside an exercise name stay; number words that are quantities still count', () => {
    expect(parseWorkoutText('One-arm Dumbbell Row 20 kg for 10').rows[0]).toMatchObject({ query: 'one-arm dumbbell row', sets: [{ kg: 20, reps: 10 }] });
    expect(parseWorkoutText('one arm dumbbell row twenty kg for ten').rows[0]).toMatchObject({ query: 'one arm dumbbell row', sets: [{ kg: 20, reps: 10 }] });
    expect(sets('bench press eighty for eight')).toEqual([[80, 8]]);
    expect(sets('bench three sets of eight at eighty')).toEqual([[80, 8], [80, 8], [80, 8]]);
    expect(sets('bench eight eight six reps at eighty kg')).toEqual([[80, 8], [80, 8], [80, 6]]);
  });
});
