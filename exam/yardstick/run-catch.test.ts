// The yardstick's catch rate (docs/COACH.md §8): score saved answers against the catch lists with one or two yes/no checkers.
//   NODE_USE_ENV_PROXY=1 npx vitest run --config exam/vitest.config.ts exam/yardstick/run-catch.test.ts
// Env: EXAM_OUT       the folder with answers.jsonl (from run-answers); verdicts and the report are written there too
//      CATCH_SETUPS   comma list of setups to score (default: every setup in answers.jsonl)
//      CATCH_JUDGES   comma list of checker models (default claude-sonnet-5-5,gemini-3-flash-preview)
//      CATCH_EFFORT   Claude's effort (default low) · EXAM_CAP_USD (required unless EXAM_DRY) · EXAM_LEDGER · EXAM_DRY=1
//      CATCH_REPORT_ONLY=1  no calls: rebuild the report from the saved verdicts (an answer one checker never read counts that checker's verdicts only)
//      CATCH_LABELS   optional "setup=label" pairs for the report, e.g. sonnetfable=Coach,opusformat=plain Opus
// A verdict is saved as it arrives and reused for the exact same request, so a stopped run resumes for free.
// Only the 20 tuning cases are scored, the newest answer of each; answers whose case or records changed since are refused.
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Ledger, type GeminiReply } from '../providers';
import { CASES } from '../v2/cases';
import { caseHash, type CaseRun } from '../v2/run-case';
import { CATCH, TUNING } from './catch-lists';
import { catchRate, checkBody, checkKey, checkOne, type ItemVerdict } from './checker';
import { handReadAgreement } from './hand-read';

const DRY = !!process.env.EXAM_DRY;
const IN = process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/e2v2';
const OUT = `${IN}${DRY ? '/dry' : ''}`;
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const JUDGES = (process.env.CATCH_JUDGES ?? 'claude-sonnet-5-5,gemini-3-flash-preview').split(',').map((s) => s.trim()).filter(Boolean);
const EFFORT = (process.env.CATCH_EFFORT ?? 'low') as 'low' | 'medium' | 'high';
const LABELS = Object.fromEntries((process.env.CATCH_LABELS ?? '').split(',').filter((s) => s.includes('=')).map((s) => s.split('=').map((x) => x.trim())));
const label = (s: string) => LABELS[s] ? `${LABELS[s]} (${s})` : s;

const dryReply = (ids: string[]): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: ids.map((id) => ({ id, quote: '', verdict: 'no' })) }) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

interface Saved { key: string; row: string; case: string; setup: string; judge: string; verdicts: Record<string, ItemVerdict>; usd: number; at: string }

it('scores the saved answers against the catch lists', async () => {
  if (!Number.isFinite(CAP)) throw new Error('set EXAM_CAP_USD (or EXAM_DRY=1)');
  mkdirSync(OUT, { recursive: true });
  const ledger = new Ledger(process.env.EXAM_LEDGER ?? `${OUT}/ledger-catch.jsonl`, CAP);
  const vfile = `${OUT}/catch-verdicts.jsonl`;
  const saved = new Map<string, Saved>((existsSync(vfile) ? readFileSync(vfile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Saved) : []).map((s) => [s.key, s]));
  // run-answers appends a new row when the Coach changes: score only the newest answer per case, setup and run
  const newest = new Map<string, CaseRun & { key: string; run: number }>();
  for (const l of readFileSync(`${IN}/answers.jsonl`, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l) as CaseRun & { key: string; run: number };
    newest.set(`${r.id}|${r.setup}|${r.run ?? 1}`, r);
  }
  const rows = [...newest.values()];
  const only = (process.env.CATCH_SETUPS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const byId = new Map(CASES.map((c) => [c.id, c]));
  const todo = rows.filter((r) => TUNING.includes(r.id) && (!only.length || only.includes(r.setup)));
  const stale = todo.filter((r) => r.caseHash !== caseHash(byId.get(r.id)!));
  if (stale.length) throw new Error(`stale answers (the case or its records changed since): ${stale.map((r) => `${r.id}·${r.setup}`).join(', ')}`);

  const results: Saved[] = [];
  const failed: string[] = [];
  for (const r of todo) {
    const c = byId.get(r.id)!;
    const items = CATCH[r.id];
    for (const judge of JUDGES) {
      const key = checkKey(judge, judge.startsWith('claude-') ? EFFORT : '-', checkBody(c, r, items.filter((x) => !x.code), judge));
      const hit = saved.get(key);
      // the same request from another answer (an identical reply) reuses the verdicts, bound to this answer and free
      if (hit) { results.push(hit.row === r.key ? hit : { ...hit, row: r.key, case: r.id, setup: r.setup, usd: 0 }); continue; }
      if (process.env.CATCH_REPORT_ONLY) continue;
      try {
        const ids = items.filter((x) => !x.code).map((x) => x.id);
        const got = await checkOne(judge, c, r, items, { ledger, purpose: 'catch', effort: EFFORT, ...(DRY ? { dry: () => dryReply(ids) } : {}) });
        const s: Saved = { key, row: r.key, case: r.id, setup: r.setup, judge, verdicts: got.verdicts, usd: got.usd, at: new Date().toISOString() };
        appendFileSync(vfile, `${JSON.stringify(s)}\n`);
        saved.set(key, s);
        results.push(s);
        console.log(`${r.id} · ${r.setup} · ${judge}: ${Object.values(got.verdicts).filter((v) => v.verdict === 'yes').length}/${items.length} · $${got.usd.toFixed(4)}`);
      } catch (e) {
        failed.push(`${r.id} · ${r.setup} · ${judge}: ${(e as Error).message.slice(0, 160)}`);
        console.log(`FAILED ${failed.at(-1)}`);
      }
    }
  }
  writeFileSync(`${OUT}/catch-report.md`, report(todo, results, failed));
  console.log(`spent $${ledger.spent.toFixed(3)} of $${CAP} · report: ${OUT}/catch-report.md`);
});

function report(rows: (CaseRun & { key: string })[], results: Saved[], failed: string[]): string {
  const setups = [...new Set(rows.map((r) => r.setup))];
  const cases = TUNING.filter((id) => rows.some((r) => r.id === id));
  const of = (r: CaseRun & { key: string }, judge?: string) => results.filter((s) => s.row === r.key && (!judge || s.judge === judge));
  const pct = (p: number, n: number) => (n ? `${Math.round((100 * p) / n)} %` : '–');
  const out: string[] = ['# Catch rate', '', `Cases: ${cases.length} tuning cases with answers · checkers: ${JUDGES.join(', ')} (Claude effort ${EFFORT}) · an item the checkers split on counts half.`, ''];

  out.push('| Setup | Catch rate (both checkers) | ' + JUDGES.map((j) => `${j} alone`).join(' | ') + ' | Safety misses | Slips (code checks failed) |');
  out.push('|---|---|' + JUDGES.map(() => '---|').join('') + '---|---|');
  for (const s of setups) {
    const rs = rows.filter((r) => r.setup === s && cases.includes(r.id));
    let p = 0, n = 0;
    const alone = JUDGES.map(() => ({ p: 0, n: 0 }));
    const misses: string[] = [];
    let slips = 0;
    for (const r of rs) {
      const items = CATCH[r.id];
      const got = of(r);
      if (!got.length) continue;
      const cr = catchRate(items, got.map((g) => g.verdicts));
      p += cr.points; n += cr.of; misses.push(...cr.safetyMisses);
      JUDGES.forEach((j, k) => { const g = of(r, j)[0]; if (g) { const one = catchRate(items, [g.verdicts]); alone[k].p += one.points; alone[k].n += one.of; } });
      slips += r.checks.filter((x) => !x.ok && x.name !== 'answered').length;
    }
    out.push(`| ${label(s)} | **${pct(p, n)}** (${p.toFixed(1)} of ${n}) | ${alone.map((a) => pct(a.p, a.n)).join(' | ')} | ${misses.length ? misses.join(', ') : '0'} | ${slips} |`);
  }

  out.push('', '## Per case (points of items, both checkers)', '', `| Case | ${setups.map(label).join(' | ')} |`, `|---|${setups.map(() => '---|').join('')}`);
  for (const id of cases) {
    const cells = setups.map((s) => {
      const r = rows.find((x) => x.id === id && x.setup === s);
      const got = r ? of(r) : [];
      if (!r || !got.length) return '–';
      const cr = catchRate(CATCH[id], got.map((g) => g.verdicts));
      return `${cr.points % 1 ? cr.points.toFixed(1) : cr.points}/${cr.of}`;
    });
    out.push(`| ${id} | ${cells.join(' | ')} |`);
  }

  out.push('', '## Items, answer by answer', '', 'y = yes, n = no; two letters = the two checkers in the order above; (c) = decided by code.', '');
  for (const id of cases) {
    out.push(`**${id}**`, '', `| Item | ${setups.map(label).join(' | ')} |`, `|---|${setups.map(() => '---|').join('')}`);
    for (const x of CATCH[id]) {
      const cells = setups.map((s) => {
        const r = rows.find((y) => y.id === id && y.setup === s);
        if (!r) return '–';
        if (x.code) return `${of(r)[0]?.verdicts[x.id]?.verdict?.[0] ?? '–'} (c)`;
        return JUDGES.map((j) => of(r, j)[0]?.verdicts[x.id]?.verdict?.[0] ?? '–').join('');
      });
      out.push(`| ${x.id}${x.safety ? ' (safety)' : ''} | ${cells.join(' | ')} |`);
    }
    out.push('');
  }

  // how often the two checkers agree on the model-decided items, and against the hand-read
  if (JUDGES.length === 2) {
    let same = 0, both = 0;
    for (const r of rows) {
      const [a, b] = JUDGES.map((j) => of(r, j)[0]);
      if (!a || !b) continue;
      for (const x of CATCH[r.id].filter((i) => !i.code)) { both++; if (a.verdicts[x.id]?.verdict === b.verdicts[x.id]?.verdict) same++; }
    }
    out.push(`Checkers agree on ${same} of ${both} model-decided items (${pct(same, both)}).`, '');
  }
  const hand = handReadAgreement(results);
  if (hand.length) {
    out.push('## Against the hand-read (exam/yardstick/hand-read.ts)', '');
    for (const h of hand) out.push(`- ${h.judge}: ${h.agree} of ${h.of}${h.misses.length ? ` · differs on ${h.misses.join(', ')}` : ''}`);
    out.push('');
  }
  const usd = results.reduce((s, r) => s + r.usd, 0);
  out.push(`Cost of the verdicts in this report: $${usd.toFixed(3)} (saved verdicts are reused for free; a Gemini free-tier call is priced as if paid).`);
  if (failed.length) out.push('', '## Not scored (call failed)', '', ...failed.map((f) => `- ${f}`));
  return `${out.join('\n')}\n`;
}
