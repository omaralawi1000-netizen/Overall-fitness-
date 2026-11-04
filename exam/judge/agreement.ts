/**
 * How far a judge can be trusted, measured against Omar's own blind picks (exam v3 brief, 4 Nov 2026):
 * - Cohen's kappa over three outcomes (A, B, same/tie): at least 0.75 to decide, 0.6–0.75 for triage only, below 0.6
 *   the rubric is fixed first. A judge verdict is the both-orders verdict (`combine` in pairwise.ts): a win in one order
 *   only is a tie.
 * - Length bias, both ways: does the judge pick the longer answer more often than Omar does?
 * Pure, no imports.
 */
export type Outcome = 'A' | 'B' | 'tie';

export function kappa(pairs: { omar: Outcome; judge: Outcome }[]): { kappa: number; agree: number; n: number } {
  const n = pairs.length;
  if (!n) return { kappa: NaN, agree: 0, n: 0 };
  const cats: Outcome[] = ['A', 'B', 'tie'];
  const agree = pairs.filter((p) => p.omar === p.judge).length;
  const po = agree / n;
  const pe = cats.reduce((s, c) => s + (pairs.filter((p) => p.omar === c).length / n) * (pairs.filter((p) => p.judge === c).length / n), 0);
  return { kappa: pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe), agree, n };
}

/** the brief's three bands */
export const band = (k: number): 'decide' | 'triage' | 'fix the rubric' => (k >= 0.75 ? 'decide' : k >= 0.6 ? 'triage' : 'fix the rubric');

/**
 * Length bias: among pairs where someone picked a side and the two answers differ in length by more than 20 %, how often
 * the longer one was picked. Reported for Omar and for the judge, so a judge that likes long answers (or short ones)
 * more than Omar does shows up either way.
 */
export function longerPicked(pairs: { pick: Outcome; wordsA: number; wordsB: number }[]): { rate: number; n: number } {
  const usable = pairs.filter((p) => p.pick !== 'tie' && Math.abs(p.wordsA - p.wordsB) > 0.2 * Math.max(p.wordsA, p.wordsB));
  const longer = usable.filter((p) => (p.pick === 'A') === (p.wordsA > p.wordsB)).length;
  return { rate: usable.length ? longer / usable.length : NaN, n: usable.length };
}

/** Pearson correlation of the judge's preference for A (+1 A, 0 tie, −1 B) with A's share of the words, for the report */
export function lengthCorrelation(pairs: { pick: Outcome; wordsA: number; wordsB: number }[]): number {
  const xs = pairs.map((p) => (p.pick === 'A' ? 1 : p.pick === 'B' ? -1 : 0));
  const ys = pairs.map((p) => (p.wordsA + p.wordsB ? (p.wordsA - p.wordsB) / (p.wordsA + p.wordsB) : 0));
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(xs), my = mean(ys);
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0)), sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return sx && sy ? cov / (sx * sy) : NaN;
}
