/* Made-up workout for the prototype (the repo is public). */

export const LOOK = {
  barbell: { field: '#2b0a14', halo: '#4a0a16', accent: '#e0464c' },
  dumbbells: { field: '#2a1708', halo: '#4a2810', accent: '#e8a25a' },
  cable: { field: '#0d2e27', halo: '#0f3a33', accent: '#4fc2a6' },
};
const ex = (o) => ({ note: '', ...o, sets: o.sets.map((s) => ({ done: false, ...s })) });
export const ALTS = {
  bench: [
    { id: 'dbbench', name: 'Dumbbell bench press', muscles: 'Chest · Triceps', kind: 'dumbbells', step: 2, rest: 120, kg: 32, reps: 8 },
    { id: 'chestmachine', name: 'Machine chest press', muscles: 'Chest · Triceps', kind: 'cable', step: 5, rest: 120, kg: 55, reps: 10 },
  ],
  incline: [
    { id: 'inclinebb', name: 'Incline bench press', muscles: 'Upper chest', kind: 'barbell', step: 2.5, rest: 150, kg: 60, reps: 8 },
    { id: 'inclinemachine', name: 'Incline machine press', muscles: 'Upper chest', kind: 'cable', step: 5, rest: 120, kg: 45, reps: 10 },
  ],
  fly: [
    { id: 'pecdeck', name: 'Pec deck', muscles: 'Chest', kind: 'cable', step: 5, rest: 90, kg: 50, reps: 12 },
    { id: 'dbfly', name: 'Dumbbell fly', muscles: 'Chest', kind: 'dumbbells', step: 2, rest: 90, kg: 14, reps: 12 },
  ],
  pushdown: [
    { id: 'overhead', name: 'Overhead cable extension', muscles: 'Triceps', kind: 'cable', step: 5, rest: 75, kg: 25, reps: 12 },
    { id: 'closegrip', name: 'Close-grip bench press', muscles: 'Triceps · Chest', kind: 'barbell', step: 2.5, rest: 120, kg: 60, reps: 8 },
  ],
};
export const DATES = ['7 Sep', '14 Sep', '21 Sep', '28 Sep', '5 Oct', '12 Oct', '19 Oct', '26 Oct'];
export const EX = [
  ex({ id: 'bench', name: 'Bench press', muscles: 'Chest · Triceps', kind: 'barbell', step: 2.5, rest: 150,
    sets: [{ kg: 80, reps: 8, done: true }, { kg: 82.5, reps: 6, done: true }, { kg: 82.5, reps: 6 }, { kg: 85, reps: 6 }],
    last: { date: '26 Oct', sets: [[80, 8], [82.5, 6], [82.5, 5], [82.5, 5]] }, best: { kg: 82.5, reps: 6, date: '26 Oct' },
    trend: [88.0, 89.3, 90.7, 92.0, 93.3, 94.7, 96.0, 99.0] }),
  ex({ id: 'incline', name: 'Incline dumbbell press', muscles: 'Upper chest · Shoulders', kind: 'dumbbells', step: 2, rest: 120,
    sets: [{ kg: 30, reps: 10 }, { kg: 30, reps: 10 }, { kg: 30, reps: 9 }],
    last: { date: '26 Oct', sets: [[28, 10], [28, 10], [28, 9]] }, best: { kg: 30, reps: 9, date: '19 Oct' },
    trend: [33.3, 34.0, 34.7, 35.3, 36.0, 36.0, 37.3, 37.3] }),
  ex({ id: 'fly', name: 'Cable fly', muscles: 'Chest', kind: 'cable', step: 5, rest: 90,
    sets: [{ kg: 15, reps: 12 }, { kg: 15, reps: 12 }, { kg: 15, reps: 12 }],
    last: { date: '26 Oct', sets: [[15, 12], [15, 11], [15, 10]] }, best: { kg: 15, reps: 12, date: '19 Oct' },
    trend: [18.5, 19.0, 19.0, 19.5, 20.0, 20.5, 21.0, 21.0] }),
  ex({ id: 'pushdown', name: 'Triceps pushdown', muscles: 'Triceps', kind: 'cable', step: 5, rest: 75,
    sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }],
    last: { date: '26 Oct', sets: [[30, 12], [30, 11], [30, 10]] }, best: { kg: 35, reps: 10, date: '12 Oct' },
    trend: [38, 39, 40, 40, 41, 42, 41, 42] }),
];
