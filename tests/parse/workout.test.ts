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
