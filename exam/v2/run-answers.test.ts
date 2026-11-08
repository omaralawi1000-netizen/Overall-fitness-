// Coach exam v2: run cases through setups and save every transcript (one JSON line per case, setup and run).
//   npx vitest run --config exam/vitest.config.ts exam/v2/run-answers.test.ts
// Env: EXAM_SETUPS   comma list of setup names from SETUPS below (default: flash,sonnet,opponent)
//      EXAM_CASES    comma list of case ids, or empty for all
//      EXAM_HELDOUT  1: run only the 10 held-out cases (exam/v2/cases-heldout.ts, gitignored; SHA in HELDOUT.sha256)
//      EXAM_RUNS     runs per case (default 1; the scored exam uses 3 and reports the worst)
//      EXAM_CAP_USD  required unless EXAM_DRY · EXAM_LEDGER (this provider's ledger) · EXAM_OUT (default reference/e2v2)
//      EXAM_DRY=1    no calls: a made-up reply, files under <EXAM_OUT>/dry
//      EXAM_MORE=1   also ask for "More" under the Coach's last answer (round 3 shows it; the opponent gets none)
// Behind an HTTPS proxy (the cloud), add NODE_USE_ENV_PROXY=1 so fetch goes through it.
// A (case, setup, run) already saved with the same prompt is never paid for again.
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { COACH_RULES } from '../../src/coach/coach';
import { renderKnowledge } from '../../src/coach/knowledge';
import { Ledger, type GeminiReply } from '../providers';
import { CASES } from './cases';
import { records } from './people';
import { OPPONENT_RULES, runCase, type Setup } from './run-case';
import { PREV_RULES } from './prev-rules';

export const SETUPS: Record<string, Setup> = {
  flash: { name: 'flash', quick: 'gemini-3.8-flash', deep: 'gemini-3.8-flash' },
  sonnet: { name: 'sonnet', quick: 'claude-sonnet-5-5', deep: 'claude-sonnet-5-5' },
  mix: { name: 'mix', quick: 'gemini-3.8-flash', deep: 'claude-sonnet-5-5' },
  // Flash thinking 4,096 tokens took 7–34 s a quick answer on 4 Nov (Sonnet: 2–3 s): the same mix with a small budget
  flashlow: { name: 'flashlow', quick: 'gemini-3.8-flash', deep: 'claude-sonnet-5-5', thinking: 512 },
  // a newer, bigger model as the Coach brain (Omar, 8 Nov): same Coach rules, so it compares with sonnet case by case;
  // add its price to exam/providers.ts first (a model with no price fails closed)
  fable: { name: 'fable', quick: 'claude-fable-5-1', deep: 'claude-fable-5-1' },
  opponent: { name: 'opponent', quick: 'claude-opus-5-5', deep: 'claude-opus-5-5', rules: OPPONENT_RULES },
  // the previous Coach (PR #81's instructions) on the ship setup
  prev: { name: 'prev', quick: 'gemini-3.8-flash', deep: 'claude-sonnet-5-5', rules: PREV_RULES },
};

const DRY = !!process.env.EXAM_DRY;
// in the cloud the Gemini key is added by the HTTPS proxy, which Node's fetch uses only with NODE_USE_ENV_PROXY=1
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY && !DRY) throw new Error('behind a proxy: run with NODE_USE_ENV_PROXY=1');
const OUT = `${process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/e2v2'}${DRY ? '/dry' : ''}`;
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const RUNS = Number(process.env.EXAM_RUNS ?? 1);
const pick = (v: string | undefined) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const dry = (): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ say: 'Dry run.', actions: [] }) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

it('runs the cases through the setups', async () => {
  if (!Number.isFinite(CAP)) throw new Error('set EXAM_CAP_USD (or EXAM_DRY=1)');
  mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/answers.jsonl`;
  const ledger = new Ledger(process.env.EXAM_LEDGER ?? `${OUT}/ledger.jsonl`, CAP);
  const setups = (pick(process.env.EXAM_SETUPS).length ? pick(process.env.EXAM_SETUPS) : ['flash', 'sonnet', 'opponent']).map((n) => {
    const s = SETUPS[n];
    if (!s) throw new Error(`unknown setup ${n}`);
    return s;
  });
  const only = new Set(pick(process.env.EXAM_CASES));
  // the 10 held-out cases live outside the repo; EXAM_HELDOUT=1 runs only them, from the gitignored local copy
  const pool = process.env.EXAM_HELDOUT ? (await import(/* @vite-ignore */ './cases-heldout' + '.ts')).HELDOUT as typeof CASES : CASES;
  const cases = pool.filter((c) => !only.size || only.has(c.id));
  // the prompt version: a change to the rules, the knowledge, the case or the records it makes is new work (Codex, PR #81)
  // the code that builds the request (fact sheet, reply schema, routing, checks) is part of it too: a fixed calculation
  // in buildFacts is new work even when the rules, knowledge and case are unchanged (Codex, PR #81)
  const BUILDERS = ['src/coach', 'exam/v2'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts')).sort().map((f) => readFileSync(join(d, f), 'utf8')));
  const code = createHash('sha256').update(BUILDERS.join('\n')).digest('hex');
  const version = (setupRules: string, caseJson: string) => createHash('sha256').update(`${setupRules}|${renderKnowledge()}|${caseJson}|${code}`).digest('hex').slice(0, 16);
  const done = new Set((existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((l) => l.key as string));
  let failedInARow = 0;
  for (const c of cases) {
    for (const s of setups) {
      for (let run = 1; run <= RUNS; run++) {
        const key = `${c.id}|${s.name}|${s.quick}|${s.deep}|${run}|${version(s.rules ?? COACH_RULES, JSON.stringify([c, records(c.person)]))}${process.env.EXAM_MORE ? '|more' : ''}`;
        if (done.has(key)) continue;
        const r = await runCase(c, s, { ledger, purpose: 'answers', more: !!process.env.EXAM_MORE, ...(DRY ? { dry } : {}) });
        // a failed call is no answer: never saved, so the next run asks again; three in a row stop the run
        const lost = r.turns.find((t) => t.callFailed);
        if (lost) {
          console.log(`${c.id} · ${s.name} · run ${run}: NOT SAVED, the call failed: ${lost.error}`);
          if (++failedInARow >= 3) throw new Error(`stopped: three calls in a row failed (last: ${lost.error})`);
          continue;
        }
        failedInARow = 0;
        appendFileSync(file, `${JSON.stringify({ key, at: new Date().toISOString(), run, ...r })}\n`);
        const failed = r.checks.filter((x) => !x.ok).map((x) => x.name);
        console.log(`${c.id} · ${s.name} · run ${run}: $${r.usd.toFixed(4)}${failed.length ? ` · FAILED ${failed.join(', ')}` : ''}`);
      }
    }
  }
  console.log(`spent $${ledger.spent.toFixed(2)} of $${CAP}`);
});
