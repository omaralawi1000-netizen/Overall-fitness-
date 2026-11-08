// Coach exam v3, stage 3: judge the Coach against another setup, case by case, blind and in both orders, with the
// calibrated pairwise judge (run-pair-calibration first: a judge that fails the gate judges nothing).
//   npx vitest run --config exam/vitest.config.ts exam/judge/run-pair-exam.test.ts
// Env: EXAM_OUT (the folder with answers.jsonl from run-answers) · EXAM_PAIR (default sonnet,opponent: Coach first)
//      EXAM_CASES (comma list, default all answered by both) · EXAM_CAP_USD (required unless EXAM_DRY) · EXAM_LEDGER
//      EXAM_PAIR_JUDGE (default claude-opus-5-5) · EXAM_JUDGE_EFFORT (default medium) · EXAM_DRY=1 (no calls)
// Every order is saved as it arrives and reused only for the exact same request, so a stopped run resumes for free.
// The report splits wins by kind of person (language, level, age, goal, text or expert), so a Coach that is great for
// one kind of person and poor for another shows up (Omar, 8 Nov: "a hundred million people, not my taste").
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Ledger, type GeminiReply } from '../providers';
import { calibrationPrint, judgePair, pairBody, worstRun, type OrderDone, type PairInput, type PairResult, type Side } from './pairwise';
import { CASES, type ExamCase } from '../v2/cases';
import { CHECKLISTS } from '../v2/checklists';
import { caseHash, type CaseRun } from '../v2/run-case';
import { fence } from '../../src/coach/untrusted';

const DRY = !!process.env.EXAM_DRY;
const IN = process.env.EXAM_OUT ?? '/home/user/Overall-fitness-/reference/e2v2';
// a dry run reads the real answers but writes only under <EXAM_OUT>/dry, so made-up verdicts never count as done work
const OUT = `${IN}${DRY ? '/dry' : ''}`;
const [COACH, OTHER] = (process.env.EXAM_PAIR ?? 'sonnet,opponent').split(',').map((s) => s.trim());
const ONLY = (process.env.EXAM_CASES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const JUDGE = process.env.EXAM_PAIR_JUDGE ?? 'claude-opus-5-5';
const EFFORT = (process.env.EXAM_JUDGE_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';
// EXAM_NEUTRAL=1: the neutral judge (no Answer Bar, no checklist), with its own files
const NEUTRAL = !!process.env.EXAM_NEUTRAL;
const TAG = NEUTRAL ? '-neutral' : '';
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const LEDGER = process.env.EXAM_LEDGER ?? `${OUT}/ledger-judge.jsonl`;
const SAFETY = /safety|injury|minor|weigh|wrestl|low-intake|creatine|escalate|pop-in/;

const dry = (): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ steps: 'dry', brokenA: [], brokenB: [], saferIs: 'tie', winner: 'A', reason: 'dry' }) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

/** The kinds of person a case speaks to, from its data and tags (never from the answers). */
export function kinds(c: ExamCase): string[] {
  const p = c.person;
  const out = [p.lang === 'da' ? 'Danish' : 'English', c.mode === 'expert' ? 'asks for depth' : 'texting'];
  const sessions = p.sessions?.days.length ?? 0;
  out.push(sessions < 12 ? 'beginner (<12 sessions)' : 'regular lifter');
  if (c.tags.includes('minor')) out.push('under 18');
  const mem = (p.memory ?? []).map((m) => m.text).join(' ').toLowerCase();
  if (/wrestl|football|handball|run|marathon|brydning|fodbold/.test(`${mem} ${c.tags.join(' ')} ${c.id}`)) out.push('plays a sport');
  if (p.targets?.kcal && p.weights && p.weights.perWeek < 0) out.push('cutting');
  else if (p.targets?.kcal && p.weights && p.weights.perWeek >= 0 && /bulk|gain|tage på/.test(`${mem} ${c.id}`)) out.push('bulking');
  if (c.turns.length > 1) out.push('multi-turn');
  return out;
}

/** One side as the judge sees it: every Coach turn with the person's later turns between them, More kept apart. */
function sideOf(c: ExamCase, run: CaseRun): Side {
  const parts: string[] = [];
  run.turns.forEach((t, i) => {
    if (i > 0) parts.push(`Person: ${c.turns[i].text}`);
    parts.push(run.turns.length > 1 ? `Coach: ${t.shown?.text ?? t.say ?? '(no answer: the app showed "I couldn\'t answer that")'}` : (t.shown?.text ?? t.say ?? '(no answer: the app showed "I couldn\'t answer that")'));
    if (t.more) parts.push(`[Folded under "More", shown only if the person taps it:]\n${t.more}`);
  });
  // everything the person sees besides the words: done changes, Apply buttons, the chart and the source chips (Codex, PR #86)
  const did = run.turns.flatMap((t) => [...(t.shown?.did ?? []).map((d) => d.label), ...(t.shown?.offers ?? []).map((o) => `Apply button: ${o.label}`), ...(t.shown?.show ? [`Chart shown: ${t.shown.show}`] : []), ...(t.shown?.sources ?? []).map((x) => `Source chip: ${x.topic}`)]);
  return { reply: parts.join('\n\n'), did };
}


it('judges the Coach against the other setup, case by case', async () => {
  mkdirSync(OUT, { recursive: true });
  // a judge that has not passed calibration in this folder, with this model and effort, judges nothing
  const cal = existsSync(`${OUT}/pair-calibration${TAG}-report.md`) ? readFileSync(`${OUT}/pair-calibration${TAG}-report.md`, 'utf8') : '';
  // and only for the exact calibration it passed: the same bar examples, judge prompt and gate (Codex, PR #86)
  if (!DRY && !(cal.includes('GATE PASS') && cal.includes(`judge ${JUDGE} (${EFFORT})${NEUTRAL ? ' neutral' : ''}:`) && cal.includes(`PRINT ${calibrationPrint(JUDGE, EFFORT, NEUTRAL)}`))) throw new Error(`run run-pair-calibration with EXAM_OUT=${IN} first: no passing gate for ${JUDGE} (${EFFORT}) with today's bar, prompt and gate`);
  const runs = new Map<string, CaseRun>();
  for (const l of readFileSync(`${IN}/answers.jsonl`, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l) as CaseRun;
    // keyed by the run too, so repeated runs (EXAM_RUNS) are each judged, never overwritten by the last (Codex, PR #86)
    if (!(r as { dry?: boolean }).dry) runs.set(`${r.id}|${r.setup}|${(r as { run?: number }).run ?? 1}`, r);
  }
  const get = (c: ExamCase, setup: string, n: number) => runs.get(`${c.id}|${setup}|${n}`);
  // run n of the Coach is judged against run n of the other setup
  const pairsOf = (c: ExamCase) => [...new Set([...runs.values()].filter((r) => r.id === c.id).map((r) => (r as { run?: number }).run ?? 1))].sort((a, b) => a - b).filter((n) => get(c, COACH, n) && get(c, OTHER, n));
  // only answers made from today's case and records, with their fact sheet saved, are judged; the rest are named (Codex, PR #86)
  const fresh = (c: ExamCase, setup: string, n: number) => { const r = get(c, setup, n); return !!r && r.caseHash === caseHash(c) && !!r.facts; };
  const wanted = CASES.filter((c) => (!ONLY.length || ONLY.includes(c.id)) && pairsOf(c).length);
  // a run only one side answered is never silently dropped either
  const unpaired = (c: ExamCase) => [COACH, OTHER].some((st) => [...runs.values()].some((r) => r.id === c.id && r.setup === st && !pairsOf(c).includes((r as { run?: number }).run ?? 1)));
  const stale = wanted.filter((c) => unpaired(c) || pairsOf(c).some((n) => !fresh(c, COACH, n) || !fresh(c, OTHER, n))).map((c) => c.id);
  if (stale.length) console.log(`NOT JUDGED (answers made from an older case, without a saved fact sheet, or a run only one side has; run the answers again): ${stale.join(', ')}`);
  const cases = wanted.filter((c) => !stale.includes(c.id));
  if (!cases.length) throw new Error(`no case answered by both ${COACH} and ${OTHER} in ${IN}`);
  const file = `${OUT}/pair-exam${TAG}-orders.jsonl`;
  const key = (x: PairInput, k: 0 | 1) => createHash('sha256').update(`${JUDGE}|${EFFORT}|${JSON.stringify(pairBody(k === 0 ? x : { ...x, a: x.b, b: x.a }))}`).digest('hex');
  const saved = new Map<string, OrderDone>((existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((l) => [l.key, l.d]));
  const ledger = new Ledger(LEDGER, CAP);
  const rows: { c: ExamCase; r: PairResult; runs: number }[] = [];
  const coachSide = new Map<string, boolean>();
  for (const c of cases) {
    // the Coach is A on even-hashed ids, so the judge never sees it in one fixed place
    const coachA = parseInt(createHash('sha256').update(c.id).digest('hex').slice(-1), 16) % 2 === 0;
    coachSide.set(c.id, coachA);
    const t0 = c.turns[0];
    // what both coaches were given: the saved fact sheet, and any attached page or label inside its untrusted fence (Codex, PR #86)
    const said = t0.notice ? `(no message: the app asks the Coach to speak first: ${t0.notice})` : [t0.text, t0.untrusted ? fence(t0.untrusted.text, t0.untrusted.source) : ''].filter(Boolean).join('\n');
    const each: PairResult[] = [];
    for (const n of pairsOf(c)) {
      const mine = sideOf(c, get(c, COACH, n)!), theirs = sideOf(c, get(c, OTHER, n)!);
      const x: PairInput = { id: c.id, facts: get(c, COACH, n)!.facts!, conversation: [{ role: 'user', text: said }], good: c.good, checklist: c.checklist ?? CHECKLISTS[c.id]?.list, a: coachA ? mine : theirs, b: coachA ? theirs : mine, ...(NEUTRAL ? { neutral: true } : {}) };
      const keys = [key(x, 0), key(x, 1)] as const;
      const r = await judgePair(JUDGE, x, { ledger, purpose: 'pair exam', effort: EFFORT, ...(DRY ? { dry } : {}) }, [saved.get(keys[0]), saved.get(keys[1])], (k, d) => appendFileSync(file, `${JSON.stringify({ key: keys[k], id: c.id, d })}\n`));
      // turned to the Coach's view: A is always the Coach from here on
      const flip = (p: PairResult['winner']) => (coachA ? p : p === 'A' ? 'B' : p === 'B' ? 'A' : 'tie');
      each.push({ ...r, winner: flip(r.winner), saferIs: flip(r.saferIs), brokenA: coachA ? r.brokenA : r.brokenB, brokenB: coachA ? r.brokenB : r.brokenA });
    }
    // the case scores the Coach's worst run, and any run where the other side was safer marks it
    const w = worstRun(each);
    rows.push({ c, runs: each.length, r: { ...w, saferIs: each.some((r) => r.saferIs === 'B') ? 'B' : w.saferIs } });
  }
  const pts = (w: string) => (w === 'A' ? 1 : w === 'tie' ? 0.5 : 0);
  const out: string[] = [`# ${COACH} (the Coach) vs ${OTHER}, judged by ${JUDGE} (${EFFORT})${NEUTRAL ? ', NEUTRAL judge (no Answer Bar, no checklist)' : ''}, both orders`, ''];
  const total = rows.reduce((s, x) => s + pts(x.r.winner), 0);
  out.push(`Coach score ${total} of ${rows.length} (${Math.round((100 * total) / rows.length)} %; a win counts only when it wins in both orders, a split is a tie = half).`);
  const safetyLoss = rows.filter((x) => x.r.saferIs === 'B' || (SAFETY.test(`${x.c.id} ${x.c.tags.join(' ')}`) && x.r.winner === 'B'));
  out.push(`Safety: ${safetyLoss.length ? `LOST on ${safetyLoss.map((x) => x.c.id).join(', ')}` : 'never lost'}.`);
  const split = rows.filter((x) => x.r.orders[0].winner !== x.r.orders[1].winner).length;
  // the bar rewards short texts and only the Coach was told its rules, so a win where the other side broke only the
  // length/format rules (1 text length, 2 expert length, 3 More/voice) is home advantage, not substance
  const FORM = new Set([1, 2, 3]);
  const formOnly = rows.filter((x) => x.r.winner === 'A' && x.r.brokenB.length > 0 && x.r.brokenB.every((n) => FORM.has(n)));
  if (stale.length) out.push(`Not judged (stale answers): ${stale.join(', ')}.`);
  out.push(`The judge disagreed with itself across the two orders on ${split} of ${rows.length}.`);
  out.push(`Coach wins where the other side broke only length/format rules (1-3): ${formOnly.length} (${formOnly.map((x) => x.c.id).join(', ') || 'none'}). Without them the Coach scores ${total - formOnly.length} of ${rows.length - formOnly.length}.`, '', '## By kind of person', '');
  const groups = new Map<string, { n: number; s: number }>();
  for (const x of rows) for (const k of kinds(x.c)) { const g = groups.get(k) ?? { n: 0, s: 0 }; g.n++; g.s += pts(x.r.winner); groups.set(k, g); }
  for (const [k, g] of [...groups].sort((a, b) => a[1].s / a[1].n - b[1].s / b[1].n)) out.push(`- ${k}: ${g.s} of ${g.n} (${Math.round((100 * g.s) / g.n)} %)`);
  out.push('', '## Every case (Coach view: A = Coach)', '');
  if (rows.some((x) => x.runs > 1)) out.push('Cases answered more than once score the Coach\'s worst run.', '');
  for (const x of rows) out.push(`- ${x.c.id}${x.runs > 1 ? ` (worst of ${x.runs} runs)` : ''}: ${x.r.winner === 'A' ? 'Coach' : x.r.winner === 'B' ? OTHER.toUpperCase() : 'tie'} (orders ${x.r.orders.map((o) => (o.winner === 'tie' ? 'tie' : (o.winner === 'A') === coachSide.get(x.c.id) ? 'Coach' : 'other')).join('/')}) · Coach broke [${x.r.brokenA}] · other broke [${x.r.brokenB}] · ${x.r.orders[0].reason}`);
  out.push('', `Spent $${ledger.spent.toFixed(2)} of $${CAP} on this ledger.`);
  writeFileSync(`${OUT}/pair-exam${TAG}-report.md`, `${out.join('\n')}\n`);
  console.log(out.join('\n'));
}, 3_600_000);
