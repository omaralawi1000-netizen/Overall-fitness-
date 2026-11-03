// Coach quality exam (E2 v2): calibrate the pairwise judge on the Answer Bar's own Good/Bad pairs, before it judges
// anything. Each pair is judged in both orders; the judge passes only if it picks Good both ways on 90 % and never Bad.
//   npx vitest run --config exam/vitest.config.ts exam/judge/run-pair-calibration.test.ts
// Env: EXAM_CAP_USD (required unless EXAM_DRY) · EXAM_LEDGER (this provider's ledger, e.g. e2v2-anthropic.jsonl)
//      EXAM_PAIR_JUDGE (default claude-opus-5-5) · EXAM_JUDGE_EFFORT (default medium) · EXAM_OUT (default reference/e2v2)
//      EXAM_DRY=1: no calls, a made-up verdict, nothing written outside <EXAM_OUT>/dry
// Each order is saved as it arrives. A saved order is reused only when the judge, effort AND the exact request (pair,
// facts, rules, prompt) are the same, so an edited Answer Bar is judged again, never passed on old verdicts (Codex, PR #75).
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Ledger, type GeminiReply } from '../providers';
import { barPairs, fromBarPair, judgePair, pairBody, pairGate, type OrderDone, type PairInput } from './pairwise';

const DRY = !!process.env.EXAM_DRY;
const OUT = `${process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/e2v2'}${DRY ? '/dry' : ''}`;
const JUDGE = process.env.EXAM_PAIR_JUDGE ?? 'claude-opus-5-5';
const EFFORT = (process.env.EXAM_JUDGE_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const LEDGER = process.env.EXAM_LEDGER ?? `${OUT}/ledger.jsonl`;

const dry = (): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ brokenA: [], brokenB: [], saferIs: 'tie', winner: 'A', reason: 'dry' }) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

it('calibrates the pairwise judge on the Answer Bar', async () => {
  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/pair-calibration-orders.jsonl`;
  // the key is the exact request body of that order: any change to the pair, its facts, the rules or the prompt is new work
  const key = (x: PairInput, k: 0 | 1) => {
    const body = pairBody(k === 0 ? x : { ...x, a: x.b, b: x.a });
    return createHash('sha256').update(`${JUDGE}|${EFFORT}|${JSON.stringify(body)}`).digest('hex');
  };
  const saved = new Map<string, OrderDone>((existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((l) => [l.key, l.d]));
  const ledger = new Ledger(LEDGER, CAP);
  const results = [];
  const report: string[] = [];
  for (const pair of barPairs()) {
    const x = fromBarPair(pair, true);
    const keys = [key(x, 0), key(x, 1)] as const;
    const r = await judgePair(JUDGE, x, { ledger, purpose: 'pair calibration', effort: EFFORT, ...(DRY ? { dry } : {}) }, [saved.get(keys[0]), saved.get(keys[1])], (k, d) => {
      appendFileSync(file, `${JSON.stringify({ key: keys[k], d })}\n`);
    });
    results.push({ pair, goodFirst: true, r });
    report.push(`${pair.id}: ${r.winner === 'A' ? 'Good' : r.winner === 'B' ? 'BAD' : 'tie'} (orders: ${r.orders.map((o) => o.winner).join('/')}) · Good broke [${r.brokenA}] · Bad broke [${r.brokenB}] · ${r.orders[0].reason}`);
  }
  const g = pairGate(results);
  report.push(`\nGATE ${g.pass ? 'PASS' : 'FAIL'}: Good won ${g.right} of ${results.length}; wrong ${g.wrong.join(', ') || 'none'}; ties ${g.ties.join(', ') || 'none'}. Spent $${ledger.spent.toFixed(2)} of $${CAP}.`);
  writeFileSync(`${OUT}/pair-calibration-report.md`, `${report.join('\n')}\n`);
  console.log(report.join('\n'));
});
