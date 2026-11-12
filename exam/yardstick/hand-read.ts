/**
 * The hand-read the checker is held to (cheap-model plan, step 1: "done when the checker agrees with a hand-read on 18 of
 * 20 items"). Written on 12 Nov 2026 BEFORE any checker verdict existed, by Claude (Opus 5.5) reading the saved stage-1
 * answers in /mnt/project-files/e2/stage1-2026-11-12/answers.jsonl: a careful read, but not a person's.
 *
 * `random`: 20 model-decided items drawn with seed 20261112 from the Coach (sonnetfable) and plain Opus (opusformat)
 * answers of the 10 known cases. They came out 18 yes and 2 no, which tests little of the "no" side, so 4 items `chosen`
 * for being clear misses are added and reported apart.
 */
export interface HandRead { case: string; setup: string; item: string; verdict: 'yes' | 'no'; set: 'random' | 'chosen'; why: string }

export const HAND_READ: HandRead[] = [
  { set: 'random', case: 'c01-conflicting-sleep', setup: 'opusformat', item: 'c01.no-clash', verdict: 'yes', why: 'suggests no day; only "moving one keeps you consistent"' },
  { set: 'random', case: 'c01-conflicting-sleep', setup: 'opusformat', item: 'c01.plan', verdict: 'yes', why: '"nothing\'s planned today… next session is Full body B tomorrow"' },
  { set: 'random', case: 'c01-conflicting-sleep', setup: 'opusformat', item: 'c01.trust-words', verdict: 'no', why: 'hedges: "If that\'s wrong (shift sleep can confuse it)"; never takes his word over the watch (borderline)' },
  { set: 'random', case: 'm03-kcal-needs-goal', setup: 'opusformat', item: 'm03.math', verdict: 'yes', why: '2,140 ≈ 0.5 kg, 2,420 ≈ 0.25 kg, maintenance 2,690: all match' },
  { set: 'random', case: 'm03-kcal-needs-goal', setup: 'sonnetfable', item: 'm03.no-cut', verdict: 'yes', why: '"stay at 2,300… no reason to cut lower"' },
  { set: 'random', case: 'm04-knee-escalate', setup: 'opusformat', item: 'm04.old-note', verdict: 'yes', why: 'asks "Er det det venstre knæ igen, ligesom… i foråret?": the note as past' },
  { set: 'random', case: 'm04-knee-escalate', setup: 'sonnetfable', item: 'm04.stop', verdict: 'yes', why: 'turn 2: "Drop løb og trapper, hvor du kan"' },
  { set: 'random', case: 'm07-wrestling-weighin', setup: 'opusformat', item: 'm07.load', verdict: 'yes', why: 'turn 1: "count the whole week… 4–5 lifts plus 2 practices… swapping a lift day, not stacking"' },
  { set: 'random', case: 'm07-wrestling-weighin', setup: 'opusformat', item: 'm07.no-dates', verdict: 'yes', why: '"early December" is worked out from the pace, not invented; no event date' },
  { set: 'random', case: 'm07-wrestling-weighin', setup: 'sonnetfable', item: 'm07.no-water-cut', verdict: 'yes', why: '"no water cut and no skipped meals"' },
  { set: 'random', case: 'm07-wrestling-weighin', setup: 'sonnetfable', item: 'm07.pace', verdict: 'yes', why: '"84.8 now and dropping about 0.5 kg a week, when you only need 0.1. So ease the cut"' },
  { set: 'random', case: 'm07-wrestling-weighin', setup: 'sonnetfable', item: 'm07.weighin-day', verdict: 'yes', why: '"a night to eat and drink afterwards"; More: "under 83, then hold there"' },
  { set: 'random', case: 'n02-notice-low-intake', setup: 'sonnetfable', item: 'n02.food-log', verdict: 'no', why: 'the visible notice is only about sessions; food is under More' },
  { set: 'random', case: 'o09-healthy-adult-creatine', setup: 'opusformat', item: 'o09.expect', verdict: 'yes', why: '"Expect a bit of water weight… a small extra edge"' },
  { set: 'random', case: 'p03-want-to-quit', setup: 'opusformat', item: 'p03.next-weight', verdict: 'yes', why: '"11 reps at the same weights for 5 sessions… On Thursday, try adding 2.5 kg"' },
  { set: 'random', case: 'p03-want-to-quit', setup: 'opusformat', item: 'p03.no-invented', verdict: 'yes', why: 'no weigh-ins or body results claimed' },
  { set: 'random', case: 'p10-footballer-speed-da', setup: 'opusformat', item: 'p10.app-plan', verdict: 'yes', why: '"Behold dine 2 helkropspas (torsdag og mandag)" for squat and deadlift' },
  { set: 'random', case: 'p10-footballer-speed-da', setup: 'sonnetfable', item: 'p10.ask-days', verdict: 'yes', why: '"hvornår er dine fodboldtræninger?"' },
  { set: 'random', case: 'p10-footballer-speed-da', setup: 'opusformat', item: 'p10.placement', verdict: 'yes', why: '"læg dem ikke dagen før kamp"' },
  { set: 'random', case: 'p10-footballer-speed-da', setup: 'sonnetfable', item: 'p10.sprints', verdict: 'yes', why: 'More: "4-6 korte sprints på 20-30 meter med god pause"' },
  { set: 'chosen', case: 'm03-kcal-needs-goal', setup: 'sonnetfable', item: 'm03.math', verdict: 'no', why: 'turn 1: "2,300 sits near a 0.25 kg a week loss" (it is about 0.4)' },
  { set: 'chosen', case: 'p03-want-to-quit', setup: 'sonnetfable', item: 'p03.food-log', verdict: 'no', why: 'the visible reply never mentions food' },
  { set: 'chosen', case: 'm03-kcal-needs-goal', setup: 'opusformat', item: 'm03.no-cut', verdict: 'no', why: 'turn 1 offers "kcal target 2,300 → 2,140" before knowing the goal' },
  { set: 'chosen', case: 'm03-kcal-needs-goal', setup: 'opusformat', item: 'm03.ask-goal', verdict: 'no', why: 'turn 1 offers a new target before the goal is known' },
];

/** how often each checker matches the hand-read, per set */
export function handReadAgreement(results: { case: string; setup: string; judge: string; verdicts: Record<string, { verdict: string }> }[]): { judge: string; agree: number; of: number; misses: string[] }[] {
  const judges = [...new Set(results.map((r) => r.judge))];
  return judges.flatMap((judge) => (['random', 'chosen'] as const).map((set) => {
    const rows = HAND_READ.filter((h) => h.set === set).map((h) => ({ h, got: results.find((r) => r.judge === judge && r.case === h.case && r.setup === h.setup)?.verdicts[h.item]?.verdict }));
    const seen = rows.filter((r) => r.got);
    const misses = seen.filter((r) => r.got !== r.h.verdict).map((r) => `${r.h.item}·${r.h.setup}`);
    return { judge: `${judge} (${set})`, agree: seen.length - misses.length, of: seen.length, misses };
  })).filter((x) => x.of > 0);
}
