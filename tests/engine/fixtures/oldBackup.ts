/**
 * A made-up old Aven backup (persona: Jonas, invented; the repo is public), in old Aven's exact format
 * (`{ app: 'aven', v: 1, exportedAt, data: AppData, chat?, photos? }`, src/lib/backup.ts and src/lib/types.ts).
 */
const t = (iso: string) => Date.parse(iso);
export function oldData() {
  return {
    v: 1,
    settings: { name: 'Jonas', language: 'da', dayStartHour: 4, weekStart: 1, units: { weight: 'kg', distance: 'km', length: 'cm' }, restDefaultSec: 150,
      goals: { kcal: 2600, protein: 170, waterMl: 2500 }, meals: [{ id: 'breakfast', name: '' }], theme: 'dark', palette: 'ember' },
    foods: [{ id: 'my-skyr', name: 'Skyr' }], favourites: [], savedMeals: [{ id: 'm1' }], recipes: [], choices: { skyr: 'my-skyr' }, increments: { 'bench-press': 2.5 },
    entries: [
      { id: 'e1', date: '2026-10-30', mealId: 'breakfast', at: t('2026-10-30T07:40:00+01:00'), snap: { foodId: 'ref:skyr', name: 'Skyr natural', source: 'reference', basis: 'g', per100: { kcal: 63, protein: 11 }, portions: [] },
        qty: { amount: 200, unit: 'g' }, base: 200, nutrients: { kcal: 126, protein: 22 } },
      { id: 'e2', date: '2026-10-30', mealId: 'snacks', at: t('2026-10-31T01:30:00+01:00'), snap: { name: 'Banana', source: 'reference', basis: 'g', per100: { kcal: 89 }, portions: [{ id: 'p1', label: '1 medium', amount: 118, verified: false }] },
        qty: { amount: 1, unit: 'portion', portionId: 'p1' }, base: 118, nutrients: { kcal: 105 }, estimated: true },
      { id: 'e3', date: '2026-10-31', mealId: 'dinner', at: t('2026-10-31T19:00:00+01:00'), snap: { name: 'Quick add', source: 'quick', basis: 'g', per100: {}, portions: [] }, qty: { amount: 1, unit: 'g' }, base: 1, nutrients: { kcal: 700 }, quick: true },
      { id: 'broken', date: 'yesterday' },
    ],
    water: [{ id: 'w1', date: '2026-10-30', ml: 500, at: t('2026-10-30T09:00:00+01:00') }],
    exercises: [{ id: 'custom-1', name: 'Neck bridge', muscles: ['core'], equipment: ['bodyweight'], movement: 'core', logType: 'bodyweightReps', instructions: [], custom: true }],
    routines: [{ id: 'r1', name: 'Push', items: [{ id: 'i1', exerciseId: 'bench-press', warmupSets: 1, workingSets: 3, repMin: 6, repMax: 8, restSec: 150 }, { id: 'i2', exerciseId: 'custom-1', warmupSets: 0, workingSets: 2, repMin: 10, repMax: 15, restSec: 60 }], createdAt: t('2026-09-01T10:00:00Z'), updatedAt: t('2026-09-02T10:00:00Z') }],
    schedule: { mode: 'weekly', weekly: { 0: null, 1: 'r1', 2: null, 3: 'r1', 4: null, 5: null, 6: null }, rotation: { order: [], pointer: 0, perWeek: 3 }, overrides: [], cleared: [], activities: { 2: ['wrestling'] } },
    sessions: [
      { id: 'ses1', name: 'Push', routineId: 'r1', date: '2026-10-30', startedAt: t('2026-10-30T16:00:00+01:00'), endedAt: t('2026-10-30T17:05:00+01:00'), pausedMs: 0, status: 'done',
        exercises: [{ id: 'x1', exerciseId: 'bench-press', sets: [
          { id: 's1', type: 'warmup', weightKg: 40, reps: 10, done: true, completedAt: t('2026-10-30T16:05:00+01:00') },
          { id: 's2', type: 'working', weightKg: 80, reps: 6, done: true, completedAt: t('2026-10-30T16:10:00+01:00'), target: { repMin: 6, repMax: 8, weightKg: 80 } },
          { id: 's3', type: 'working', weightKg: 80, reps: 8, done: false, target: { repMin: 6, repMax: 8, weightKg: 80 } },
        ] }, { id: 'x2', exerciseId: 'custom-1', sets: [{ id: 's4', type: 'working', reps: 12, done: true, completedAt: t('2026-10-30T16:50:00+01:00') }] }] },
    ],
    active: { id: 'ses2', name: 'Legs', date: '2026-11-01', startedAt: t('2026-11-01T16:00:00+01:00'), pausedMs: 0, status: 'active', exercises: [] },
    weights: [{ id: 'bw1', date: '2026-10-30', kg: 82.4, at: t('2026-10-30T07:00:00+01:00') }],
    measurements: [{ id: 'm1', date: '2026-10-01', kind: 'waist', cm: 84 }],
    photos: [{ id: 'ph1', date: '2026-10-01' }],
    activities: [{ id: 'a1', date: '2026-10-28', kind: 'wrestling', durationSec: 5400, rounds: 6, intensity: 3, at: t('2026-10-28T19:30:00+01:00') }, { id: 'a2', date: '2026-10-29', kind: 'stairs', durationSec: 600, at: t('2026-10-29T12:00:00+01:00'), source: 'watch' }],
    notes: [], steps: [{ date: '2026-10-30', count: 9120 }], health: [{ date: '2026-10-30', restHr: 52, sleepMin: 410 }, { date: '2026-10-31', hrv: 61 }],
    catchUps: [], targets: [], marks: {}, hcGone: [],
    memory: [{ id: 'mem1', text: 'Left shoulder sore until Friday', kind: 'health', at: t('2026-10-29T10:00:00+01:00'), until: '2026-10-31', exerciseIds: ['bench-press'] },
      { id: 'mem2', text: 'Cut to 80 kg by Christmas', kind: 'goal', at: t('2026-10-01T10:00:00+01:00'), goal: { metric: 'weight', target: 80, by: '2026-12-24', startDate: '2026-10-01', start: 83 } }],
    reviews: [], demo: false,
  };
}
export function oldBackupText(extra: Record<string, unknown> = {}) {
  return JSON.stringify({ app: 'aven', v: 1, exportedAt: '2026-11-01T12:00:00.000Z', data: oldData(), chat: [{ id: 'c1', at: 1, role: 'user', text: 'hi' }], photos: { ph1: 'data:image/jpeg;base64,AAAA' }, ...extra });
}
