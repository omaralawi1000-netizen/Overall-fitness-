/**
 * The number audit (E2 plan v2): numbers in a Coach reply that appear nowhere in what the Coach was given. A lead for the
 * judges and for a person reading the transcript, never a fail by itself: a sum or a difference (215 − 120 = 95) is
 * honest work and shows up here too. Small counts (10 and under) are left out; they are almost always "2 eggs", "3 sets".
 * Pure, no imports: tested in this repo (tests/exam/numbers.test.ts).
 */
const NUM = /\d+(?:[.,]\d+)*/g;

/** "2,600" may be 2600 or 2.6, "87,6" may be 87.6 or 876, "1.200" may be 1200 or 1.2: keep every reading. */
function readings(tok: string): number[] {
  const out = new Set<number>([Number(tok.replace(/[.,]/g, ''))]);
  const parts = tok.split(/[.,]/);
  if (parts.length === 2) out.add(Number(`${parts[0]}.${parts[1]}`));
  if (parts.length > 2) out.add(Number(`${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`));
  return [...out].filter(Number.isFinite);
}

export function unsourcedNumbers(reply: string, given: string): string[] {
  const known = new Set<number>();
  for (const m of given.matchAll(NUM)) for (const n of readings(m[0])) known.add(n);
  const out: string[] = [];
  for (const m of reply.matchAll(NUM)) {
    const rs = readings(m[0]);
    if (rs.every((n) => n <= 10)) continue;
    if (!rs.some((n) => known.has(n)) && !out.includes(m[0])) out.push(m[0]);
  }
  return out;
}
