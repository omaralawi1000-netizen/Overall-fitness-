// Generated phrases: a grammar builds spoken phrases with the answer known in advance (see gen/grammar.ts).
// Each run checks GEN_N phrases (default 30 000, a few seconds); a deep run sets GEN_N=1000000 and GEN_SEED.
// GEN_REPORT=<file> writes the counts and the first failures per family as JSON.
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { understand, type Understood } from '../../src/engine/parse';
import { judge } from './judge';
import { gen, FAMILIES, type Family } from './gen/grammar';

const N = Number(process.env.GEN_N ?? 30000);
const SEED = Number(process.env.GEN_SEED ?? 1);

/** Whatever was read, it must be sane: no impossible number is ever logged. */
function insane(u: Understood): string {
  const bad = (x: number | undefined) => x !== undefined && !(Number.isFinite(x) && x > 0);
  if (u.kind === 'command' && u.cmd.kind === 'set') {
    if (bad(u.cmd.kg) || bad(u.cmd.reps) || (u.cmd.reps !== undefined && !Number.isInteger(u.cmd.reps))) return 'bad set numbers';
    if ((u.cmd.kg ?? 0) > 1000) return 'kg over 1000';
  }
  if (u.kind === 'command' && u.cmd.kind === 'rest' && !(u.cmd.sec > 0 && u.cmd.sec <= 3600)) return 'bad rest';
  if (u.kind === 'water' && !(u.ml >= 10 && u.ml <= 5000)) return 'water out of range';
  if (u.kind === 'bodyweight' && !(u.kg >= 30 && u.kg <= 300)) return 'body weight out of range';
  if (u.kind === 'food') for (const r of u.rows) if (!(Number.isFinite(r.amount) && r.amount > 0) || (r.dim !== 'count' && r.amount > 5000)) return 'bad food amount';
  if (u.kind === 'workout') for (const r of u.rows) for (const s of r.row.sets) if (bad(s.kg) || bad(s.reps)) return 'bad workout numbers';
  return '';
}

describe(`generated phrases (${N}, seed ${SEED})`, () => {
  it('reads each phrase as its known answer, never logs talk, never logs nonsense, never freezes', () => {
    const stats = Object.fromEntries(FAMILIES.map((f) => [f, { run: 0, failed: 0, samples: [] as string[] }])) as Record<Family, { run: number; failed: number; samples: string[] }>;
    let slowest = 0, slowestSay = '', insaneCount = 0;
    for (let i = 0; i < N; i++) {
      const p = gen(SEED, i);
      const t0 = performance.now();
      const u = understand(p.say, { workoutOpen: p.open });
      const ms = performance.now() - t0;
      if (ms > slowest) { slowest = ms; slowestSay = p.say; }
      const s = stats[p.family];
      s.run++;
      const why = insane(u) || (p.family === 'noise' ? '' : judge(u, p.expect));
      const noiseWhy = p.family === 'noise' ? insane(u) : '';
      if (insane(u)) insaneCount++;
      if (why || noiseWhy) { s.failed++; if (s.samples.length < 8) s.samples.push(`${JSON.stringify(p.say)} (${p.open ? 'workout' : 'none'}) → ${why || noiseWhy}`); }
    }
    const failed = FAMILIES.reduce((n, f) => n + stats[f].failed, 0);
    if (process.env.GEN_REPORT) writeFileSync(process.env.GEN_REPORT, JSON.stringify({ n: N, seed: SEED, failed, insaneCount, slowestMs: Math.round(slowest * 10) / 10, slowestSay, stats }, null, 1));
    expect(slowest, `slowest phrase ${JSON.stringify(slowestSay)}`).toBeLessThan(250);
    expect(insaneCount).toBe(0);
    expect(failed, JSON.stringify(Object.fromEntries(FAMILIES.map((f) => [f, stats[f]])), null, 1)).toBe(0);
  }, 600_000);
});
