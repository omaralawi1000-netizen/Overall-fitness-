// Coach exam E2: the judges and the report. Runs in this repo (no old Aven needed), on the transcripts the exam harness
// wrote (exam/v1/exam-v1.test.ts, one folder per Coach model).
//   npx vitest run --config exam/vitest.config.ts exam/judge/run-judges.test.ts
// Env: EXAM_TRANSCRIPTS=dir1,dir2,… (required) · EXAM_JUDGED (output folder, default reference/exam-v1/judged)
//      EXAM_JUDGES (default claude-opus-5-5,gemini-4-argon) · EXAM_JUDGE_STEP calibrate | judge | report | all (default all)
//      EXAM_CAP_USD (required unless EXAM_DRY) and EXAM_LEDGER (the same ledger as the Coach runs, so the cap is for everything)
//      EXAM_JUDGE_SYNC=1 (one call at a time, full price; default: the half-price batch APIs) · EXAM_JUDGE_EFFORT (Claude, default medium)
// A judge that fails calibration grades nothing. Already-judged transcripts are skipped, so a stopped run resumes.
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { callBatch, CallError, Ledger, SpendCapError, estimate, type GeminiReply } from '../providers';
import { CALIBRATION } from './calibration';
import { judgeBody, judgeOne, readVerdict, finalScore, fromCalibration, fromTranscript, gate, type JudgeInput, type Judged } from './judge';
import { HARD_10, modelRow, chatModel, topTierWorthIt, examHealth, relativeBias, scoreOf, type Answer } from './report';

const DIRS = (process.env.EXAM_TRANSCRIPTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = process.env.EXAM_JUDGED ?? '/home/user/Overall-fitness-/reference/exam-v1/judged';
const JUDGES = (process.env.EXAM_JUDGES ?? 'claude-opus-5-5,gemini-4-argon').split(',').map((s) => s.trim()) as [string, string];
const STEP = process.env.EXAM_JUDGE_STEP ?? 'all';
const DRY = !!process.env.EXAM_DRY;
const SYNC = !!process.env.EXAM_JUDGE_SYNC || DRY;
const EFFORT = (process.env.EXAM_JUDGE_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const SAFETY_IDS = /^(?:s\d|13-|20-)/;
const sizes: string[] = [];

const opaque = (key: string) => `t${createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
const lines = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

// a dry run answers with a made-up verdict and notes each judge call's size and worst-case price
const dry = (model: string, body: any): GeminiReply => {
  sizes.push(JSON.stringify({ model, chars: JSON.stringify(body).length, worstUsd: estimate(model, body, 8192 + (model.startsWith('claude-') ? 6000 : 8192)) }));
  const n = 5 + (JSON.stringify(body).length % 5);
  const v = { defects: [], reason: 'dry', understood: n, data: n, move: n, tone: n, honest: n, inventedNothing: n, invention: false, unsafe: false, lighterAgainstMemory: false };
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(v) }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 };
};

/** Every input judged by one judge: one batch (half price), then one sync retry for anything that failed or was unreadable. */
async function judgeAll(judge: string, xs: JudgeInput[], ledger: Ledger, label: string): Promise<Map<string, Judged | Error>> {
  const out = new Map<string, Judged | Error>();
  const o = { ledger, purpose: `${label} by ${judge}`, effort: EFFORT, ...(DRY ? { dry } : {}) };
  let retry = xs;
  if (!SYNC && xs.length) {
    retry = [];
    for (let i = 0; i < xs.length; i += 100) {
      const chunk = xs.slice(i, i + 100);
      const res = await callBatch(judge, chunk.map((x) => ({ id: x.id, body: judgeBody(x) })), { ...o, onPoll: (s) => console.log(`${judge} batch ${i / 100 + 1}: ${s}`) });
      for (const x of chunk) {
        const r = res.get(x.id);
        try {
          if (!r || r instanceof CallError) throw r ?? new Error('missing');
          const verdict = readVerdict(r.candidates[0]?.content.parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '');
          out.set(x.id, { id: x.id, judge, score: finalScore(verdict), verdict, usd: r.usd });
        } catch { retry.push(x); }
      }
    }
  }
  for (const x of retry) {
    try { out.set(x.id, await judgeOne(judge, x, o)); }
    catch (e) { if (e instanceof SpendCapError) throw e; out.set(x.id, e as Error); }
  }
  return out;
}

interface Row { key: string; coach: string; qid: string; run: number; t: any }
function transcripts(): Row[] {
  const rows: Row[] = [];
  for (const dir of DIRS) for (const f of readdirSync(dir).filter((x) => /\.r\d+\.json$/.test(x))) {
    const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const coach = String(t.model ?? dir.split('/').pop());
    rows.push({ key: `${coach}|${t.id}|r${t.run}`, coach, qid: t.id, run: t.run, t });
  }
  return rows;
}

it('judges the Coach exam and writes the report', async () => {
  if (!(CAP > 0)) throw new Error('set EXAM_CAP_USD (and EXAM_LEDGER to the Coach runs\' ledger, so the cap covers everything)');
  mkdirSync(OUT, { recursive: true });
  const ledger = new Ledger(DRY ? `${OUT}/dry-ledger.jsonl` : process.env.EXAM_LEDGER ?? `${OUT}/ledger.jsonl`, CAP);
  const gates: Record<string, boolean> = {};

  // 1. calibration: a judge grades only after it scores the known replies right
  for (const judge of JUDGES) {
    const file = `${OUT}/calibration-${judge}.json`;
    const prior = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    if (prior && !DRY) { gates[judge] = prior.gate.pass; continue; }
    if (STEP !== 'all' && STEP !== 'calibrate') continue;
    const res = await judgeAll(judge, CALIBRATION.map(fromCalibration), ledger, 'calibration');
    const scores = new Map<string, number>();
    for (const c of CALIBRATION) { const r = res.get(`cal:${c.id}`); if (r && !(r instanceof Error)) scores.set(c.id, r.score); }
    const g = gate(scores);
    gates[judge] = DRY || g.pass;
    writeFileSync(file, JSON.stringify({ judge, effort: EFFORT, gate: g, scores: Object.fromEntries(scores), verdicts: Object.fromEntries([...res].map(([k, v]) => [k, v instanceof Error ? String(v.message) : v.verdict])) }, null, 1));
    console.log(`calibration ${judge}: ${g.pass ? 'PASS' : 'FAIL'} (caps ${g.capsInRange}, others ${Math.round(g.othersInRange * 100)} %, Spearman ${g.spearman.toFixed(2)}${g.misses.length ? `; missed ${g.misses.map((m) => `${m.id}=${m.score}`).join(', ')}` : ''})`);
  }

  // 2. the transcripts, blind: the judge sees an opaque id, never the model; same conversations together so the facts are cached
  const rows = transcripts();
  const judgedFile = `${OUT}/judged.jsonl`;
  if ((STEP === 'all' || STEP === 'judge') && rows.length) {
    for (const judge of JUDGES) {
      if (!gates[judge]) { console.log(`${judge} did not pass calibration: it grades nothing`); continue; }
      const done = new Set(lines(judgedFile).filter((l) => l.judge === judge && !l.error).map((l) => l.key));
      const todo = rows.filter((r) => !r.t.error && !done.has(r.key)).sort((a, b) => a.qid.localeCompare(b.qid));
      const byId = new Map(todo.map((r) => [opaque(r.key), r]));
      const res = await judgeAll(judge, todo.map((r) => fromTranscript(r.t, opaque(r.key))), ledger, 'exam');
      for (const [id, j] of res) {
        const r = byId.get(id)!;
        appendFileSync(judgedFile, `${JSON.stringify({ key: r.key, coach: r.coach, qid: r.qid, run: r.run, judge, ...(j instanceof Error ? { error: j.message } : { score: j.score, verdict: j.verdict, usd: j.usd }) })}\n`);
      }
      console.log(`${judge}: judged ${[...res.values()].filter((j) => !(j instanceof Error)).length} of ${todo.length}`);
    }
  }
  if (DRY) writeFileSync(`${OUT}/dry-judge-sizes.jsonl`, `${sizes.join('\n')}\n`);

  // 3. the report
  if (STEP === 'calibrate' || !rows.length) return;
  const judged = lines(judgedFile).filter((l) => !l.error);
  const answers: Answer[] = rows.map((r) => ({
    coach: r.coach, qid: r.qid, run: r.run, safety: SAFETY_IDS.test(r.qid), heldout: /^h\d/.test(r.qid),
    check: r.t.check ?? null, flags: r.t.flags ?? [], ...(r.t.error ? { error: r.t.error } : {}),
    judged: Object.fromEntries(judged.filter((l) => l.key === r.key).map((l) => [l.judge, { score: l.score, unsafe: !!l.verdict.unsafe }])),
  }));
  writeFileSync(`${OUT}/report.md`, report(rows, answers, judged, gates, ledger));
  console.log(`report: ${OUT}/report.md`);
}, 24 * 3600_000);

function report(rows: Row[], answers: Answer[], judged: any[], gates: Record<string, boolean>, ledger: Ledger): string {
  const coaches = [...new Set(rows.map((r) => r.coach))];
  const all = coaches.map((c) => modelRow(c, answers));
  const usdPer = (c: string) => { const xs = rows.filter((r) => r.coach === c && !r.t.error).map((r) => r.t.usd ?? 0); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN; };
  const omarFile = `${OUT}/omar-pairs.json`;
  const omar = existsSync(omarFile) ? JSON.parse(readFileSync(omarFile, 'utf8')) : null;
  const health = examHealth({ gates, all: answers, judges: JUDGES, omar });
  const cheap = all.find((r) => r.coach === 'gemini-3.8-flash'), dear = all.find((r) => r.coach === 'claude-sonnet-5-5');
  const pick = cheap && dear ? chatModel(cheap, dear) : null;
  const hard = coaches.map((c) => modelRow(c, answers, HARD_10));
  const chosenHard = pick ? hard.find((r) => r.coach === pick.pick) : undefined;
  const tops = hard.filter((r) => /opus|argon/.test(r.coach));
  const worst = judged.slice().sort((a, b) => a.score - b.score).slice(0, 5);
  const f1 = (x: number) => (Number.isNaN(x) ? '–' : x.toFixed(2));
  return [
    '# Coach exam E2: report', '',
    `Judges: ${JUDGES.join(' and ')} (blind). Spent, whole ledger: $${ledger.spent.toFixed(2)}.`, '',
    '## Is the exam good enough?', '',
    ...health.checks.map((c) => `- ${c.ok ? '✓' : '✗'} ${c.name}: ${c.value}`),
    `- Self-bias (how much more ${JUDGES[0]} likes its own company's coaches than ${JUDGES[1]} does): ${relativeBias(answers, JUDGES)}`,
    health.good ? '' : '\n**Not yet: fix the exam before trusting the scores below.**', '',
    '## Scores (the 22; 1–10, mean of both judges)', '',
    '| Coach | mean | worst | under 7 | held-out | safety | re-run drift | errors | $ per answer |', '|---|---|---|---|---|---|---|---|---|',
    ...all.map((r) => `| ${r.coach} | ${f1(r.mean)} | ${f1(r.worst)} | ${r.under7.join(', ') || '–'} | ${f1(r.heldout)} | ${r.safetyPass}/${r.safetyTotal}${r.safetyDisagree.length ? ` (read: ${r.safetyDisagree.join(', ')})` : ''} | ${f1(r.drift)} | ${r.errors} | ${usdPer(r.coach).toFixed(4)} |`), '',
    '## The hard 10', '', '| Coach | mean | worst |', '|---|---|---|', ...hard.map((r) => `| ${r.coach} | ${f1(r.mean)} | ${f1(r.worst)} |`), '',
    '## Decisions (rules fixed before the run)', '',
    pick ? `- Chat model: **${pick.pick}** (${pick.why}).` : '- Chat model: needs both Flash and Sonnet results.',
    ...tops.map((t) => `- ${t.coach} as Coach: ${chosenHard ? (topTierWorthIt(t, chosenHard) ? `**worth it** (${f1(t.mean)} vs ${f1(chosenHard.mean)} on the hard 10)` : `not worth it (${f1(t.mean)} vs ${f1(chosenHard.mean)}; needs +0.75)`) : 'no chat model yet'}`), '',
    '## Five lowest-scored answers', '',
    ...worst.map((w) => `- ${w.qid} r${w.run}, ${w.coach}, ${w.judge}: ${w.score}. ${w.verdict.reason}${w.verdict.defects[0] ? ` First defect: "${String(w.verdict.defects[0].line).slice(0, 120)}" → ${w.verdict.defects[0].fix}` : ''}`), '',
    `Answers scored: ${answers.filter((a) => Object.keys(a.judged).length).length} of ${answers.length}; mean of all scored: ${f1(answers.filter((a) => Object.keys(a.judged).length).reduce((s, a) => s + scoreOf(a), 0) / Math.max(1, answers.filter((a) => Object.keys(a.judged).length).length))}.`, '',
  ].join('\n');
}
