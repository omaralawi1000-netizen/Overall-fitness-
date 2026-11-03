// Coach quality exam (E2 v2): calibrate the pairwise judge on the Answer Bar's own Good/Bad pairs, before it judges
// anything. Each pair is judged in both orders; the judge passes only if it picks Good both ways on 90 % and never Bad.
//   npx vitest run --config exam/vitest.config.ts exam/judge/run-pair-calibration.test.ts
// Env: EXAM_CAP_USD (required unless EXAM_DRY) · EXAM_LEDGER (this provider's ledger, e.g. e2v2-anthropic.jsonl)
//      EXAM_PAIR_JUDGE (default claude-opus-5-5) · EXAM_JUDGE_EFFORT (default medium) · EXAM_OUT (default reference/e2v2)
//      EXAM_DRY=1: no calls, a made-up verdict, nothing written outside <EXAM_OUT>/dry
// Results are saved per pair as they arrive, and a pair already judged by this judge at this effort is not paid for again.
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Ledger, type GeminiReply } from '../providers';
import { barPairs, fromBarPair, judgePair, pairGate, type PairResult } from './pairwise';

const DRY = !!process.env.EXAM_DRY;
const OUT = `${process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/e2v2'}${DRY ? '/dry' : ''}`;
const JUDGE = process.env.EXAM_PAIR_JUDGE ?? 'claude-opus-5-5';
const EFFORT = (process.env.EXAM_JUDGE_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const LEDGER = process.env.EXAM_LEDGER ?? `${OUT}/ledger.jsonl`;

const dry = (): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ brokenA: [], brokenB: [], saferIs: 'tie', winner: 'A', reason: 'dry' }) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

it('calibrates the pairwise judge on the Answer Bar', async () => {
  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/pair-calibration.jsonl`;
  const key = (id: string) => `${JUDGE}|${EFFORT}|${id}`;
  const saved = new Map<string, PairResult>((existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((l) => [l.key, l.r]));
  const ledger = new Ledger(LEDGER, CAP);
  const results = [];
  const report: string[] = [];
  for (const pair of barPairs()) {
    const x = fromBarPair(pair, true);
    let r = saved.get(key(x.id));
    if (!r) {
      r = await judgePair(JUDGE, x, { ledger, purpose: 'pair calibration', effort: EFFORT, ...(DRY ? { dry } : {}) });
      appendFileSync(file, `${JSON.stringify({ key: key(x.id), r })}\n`);
    }
    results.push({ pair, goodFirst: true, r });
    report.push(`${pair.id}: ${r.winner === 'A' ? 'Good' : r.winner === 'B' ? 'BAD' : 'tie'} (orders: ${r.orders.map((o) => o.winner).join('/')}) · Good broke [${r.brokenA}] · Bad broke [${r.brokenB}] · ${r.orders[0].reason}`);
  }
  const g = pairGate(results);
  report.push(`\nGATE ${g.pass ? 'PASS' : 'FAIL'}: Good won ${g.right} of ${results.length}; wrong ${g.wrong.join(', ') || 'none'}; ties ${g.ties.join(', ') || 'none'}. Spent $${ledger.spent.toFixed(2)} of $${CAP}.`);
  writeFileSync(`${OUT}/pair-calibration-report.md`, `${report.join('\n')}\n`);
  console.log(report.join('\n'));
});
