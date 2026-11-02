// Made-up workout (the repo is public). Weights in kg. `best` is the heaviest earlier set by estimated one-rep max,
// so ticking bench set 3 (82.5 × 5) is a new record and the others are not.

export const workout = {
  name: { en: 'Push day', da: 'Push-dag' },
  startedMinAgo: 24.3,
  exercises: [
    {
      name: { en: 'Bench press', da: 'Bænkpres' },
      step: 2.5,
      each: false,
      rest: 90,
      last: { w: 77.5, r: 6 },
      best: { w: 82.5, r: 4, date: '2026-08-14' },
      sets: [
        { w: 60, r: 10, done: true },
        { w: 77.5, r: 6 },
        { w: 82.5, r: 5 },
        { w: 77.5, r: 7 },
      ],
    },
    {
      name: { en: 'Incline dumbbell press', da: 'Skråbænkpres med håndvægte' },
      step: 2,
      each: true,
      rest: 75,
      last: { w: 26, r: 10 },
      best: { w: 28, r: 9, date: '2026-10-02' },
      sets: [
        { w: 26, r: 10 },
        { w: 28, r: 8 },
        { w: 28, r: 8 },
      ],
    },
  ],
};

export const e1rm = (w, r) => w * (1 + r / 30);
