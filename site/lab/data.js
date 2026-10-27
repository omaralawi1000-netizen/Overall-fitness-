// One made-up day for every direction, shaped like the exam's test person (fake data, never real).
// Tuesday 27 October, push day, cutting.
A2.day = {
  dateLong: 'Tuesday 27 October',
  dateShort: 'Tue 27 Oct',
  now: '06:12',
  name: 'Omar',
  plan: { name: 'Push', at: '15:30', exercises: 6, minutes: 62 },
  weight: { now: 93.1, week: -0.4, goal: 90, by: '31 Jan' },
  food: { kcal: 0, kcalGoal: 2550, protein: 0, proteinGoal: 220, water: 0.3, waterGoal: 3 },
  sleep: { h: 6, m: 41, usual: '6 h 40' },
  week: [
    { d: 'M', kind: 'Wrestling', done: true },
    { d: 'T', kind: 'Push', today: true },
    { d: 'W', kind: 'Wrestling' },
    { d: 'T', kind: 'Pull' },
    { d: 'F', kind: 'Push' },
    { d: 'S', kind: 'Legs' },
    { d: 'S', kind: 'Pull' },
  ],
  morningLine: 'Push today after work. Bench 80 × 8 is the target, 2.5 kg up on last week.',
  morningSub: 'Down 0.4 kg this week, right on pace for 90 kg by 31 January.',
};

// The live workout, 31 minutes in: bench press set 3 of 4.
A2.workout = {
  name: 'Push', elapsed: '31:08', done: 9, total: 22, volume: 6480,
  exercises: [
    { name: 'Bench press', note: 'Last time 77.5 × 8, 8, 7', sets: [
      { kind: 'W', prev: '50 × 10', kg: 50, reps: 10, done: true },
      { kind: 1, prev: '77.5 × 8', kg: 80, reps: 8, done: true, best: true },
      { kind: 2, prev: '77.5 × 8', kg: 80, reps: 8, done: true },
      { kind: 3, prev: '77.5 × 7', kg: 80, reps: 8, current: true },
      { kind: 4, prev: '75 × 8', kg: 77.5, reps: 8 },
    ] },
    { name: 'Incline dumbbell press', note: '30 kg dumbbells, 3 sets of 8–10', sets: [
      { kind: 1, prev: '30 × 10', kg: 30, reps: 10 }, { kind: 2, prev: '30 × 9', kg: 30, reps: 10 }, { kind: 3, prev: '30 × 8', kg: 30, reps: 9 },
    ] },
    { name: 'Cable fly', note: '3 sets of 12', sets: [ { kind: 1, prev: '15 × 12', kg: 15, reps: 12 } ] },
  ],
  rest: { total: 150, left: 94, next: 'Bench press, set 3: 80 × 8' },
};

A2.memory = [
  { t: 'Works split shifts on weekdays and trains around 15:30.', src: 'From your first talk' },
  { t: 'Wrestles Monday and Wednesday. A beginner, wants to compete one day.', src: 'From your first talk' },
  { t: 'Takes almost every set to failure. Never suggest going lighter.', src: 'You told me, 26 Oct' },
  { t: 'Cutting to 90 kg by 31 January.', src: 'Goal', goal: true },
  { t: 'The hard part is the evening: snacking after 21:00.', src: 'Learned from 3 weeks of food' },
];

A2.chat = [
  { who: 'me', t: 'why is my row stuck?' },
  { who: 'coach', t: 'Barbell row has sat at 70 × 8 for four sessions. You’re cutting and every set goes to failure, so recovery is the limit, not effort.', pill: '70 kg × 8', then: 'Next pull: keep 70 and go for 9 on the first set. When you get 9, 9, 8, move to 72.5.' },
];

// Line icons (1.8 px strokes, round ends), shared so the directions differ in design, not in icon drawing.
A2.icon = (() => {
  const s = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    check: s('<path d="M5 12.5l4.2 4.2L19 7"/>', 2.6),
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor"/></svg>',
    today: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    train: s('<path d="M3.5 9v6M6.5 7v10M17.5 7v10M20.5 9v6M6.5 12h11"/>'),
    food: s('<path d="M7 3v8a2.5 2.5 0 0 0 5 0V3M9.5 3v18M17 21V3c-2.2 1.2-3 3.5-3 6.5V13h3"/>'),
    mic: s('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    edit: s('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
    chevron: s('<path d="M9 6l6 6-6 6"/>'),
    close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  };
})();
