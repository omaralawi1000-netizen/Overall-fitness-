// Coach exam E2: the judges and the report. Runs in this repo (no old Aven needed), on the transcripts the exam harness
// wrote (exam/v1/exam-v1.test.ts, one folder per Coach model).
//   npx vitest run --config exam/vitest.config.ts exam/judge/run-judges.test.ts
// Env: EXAM_TRANSCRIPTS=dir1,dir2,… (required) · EXAM_JUDGED (output folder, default reference/exam-v1/judged)
//      EXAM_JUDGES (default claude-opus-5-5,gemini-4-argon) · EXAM_JUDGE_STEP calibrate | judge | report | all (default all)
//      EXAM_CAP_USD (required unless EXAM_DRY) and EXAM_LEDGER (the same ledger as the Coach runs, so the cap is for everything)
//      EXAM_JUDGE_SYNC=1 (one call at a time, full price; default: the half-price batch APIs) · EXAM_JUDGE_EFFORT (Claude, default medium)
// A judge that fails calibration grades nothing. Every verdict is saved the moment it arrives, and already-judged
// transcripts are skipped, so a run stopped by the cap (or anything else) resumes without paying twice.
// EXAM_DRY=1 writes only under <EXAM_JUDGED>/dry and refuses real transcripts' folders mixed with dry ones.
import { it } from 'vitest';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { callBatch, batchWorstUsd, batchSizeFor, pendingBatches, planBatches, CallError, Ledger, SpendCapError, estimate, type GeminiReply } from '../providers';
import { CALIBRATION } from './calibration';
import { judgeBody, judgeOne, readVerdict, finalScore, fromCalibration, fromTranscript, transcriptPrint, gate, type JudgeInput, type Judged, type Verdict } from './judge';
import { HARD_10, modelRow, chatModel, topTierWorthIt, examHealth, relativeBias, scoreOf, type Answer } from './report';

const DIRS = (process.env.EXAM_TRANSCRIPTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const DRY = !!process.env.EXAM_DRY;
// a dry run never shares a file with a real one: fake verdicts must not count as done work (or real ones be overwritten)
const OUT = `${process.env.EXAM_JUDGED ?? '/home/user/Overall-fitness-/reference/exam-v1/judged'}${DRY ? '/dry' : ''}`;
const JUDGES = (process.env.EXAM_JUDGES ?? 'claude-opus-5-5,gemini-4-argon').split(',').map((s) => s.trim()) as [string, string];
const STEP = process.env.EXAM_JUDGE_STEP ?? 'all';
const SYNC = !!process.env.EXAM_JUDGE_SYNC || DRY;
const EFFORT = (process.env.EXAM_JUDGE_EFFORT ?? 'medium') as 'low' | 'medium' | 'high';
const CAP = Number(process.env.EXAM_CAP_USD ?? (DRY ? 1000 : NaN));
const SAFETY_IDS = /^(?:s\d|13-|20-)/;
/** a verdict counts only if it was given by this judge at this run's effort (effort matters for Claude judges only) */
const current = (l: { judge: string; effort?: string }) => JUDGES.includes(l.judge) && (!l.judge.startsWith('claude-') || (l.effort ?? 'medium') === EFFORT);
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

/**
 * Every input judged by one judge: one batch (half price), then one sync retry for anything that failed or was unreadable.
 * `save` gets each result the moment it is final (a batch's good verdicts as soon as the batch ends), so a cap stop
 * later in the run loses nothing that was paid for.
 */
async function judgeAll(judge: string, xs: JudgeInput[], ledger: Ledger, label: string, save: (id: string, r: Judged | Error) => void): Promise<Map<string, Judged | Error>> {
  const out = new Map<string, Judged | Error>();
  const put = (id: string, r: Judged | Error) => { out.set(id, r); save(id, r); };
  const o = { ledger, purpose: `${label} by ${judge}`, effort: EFFORT, ...(DRY ? { dry } : {}) };
  let retry = xs;
  if (!SYNC && xs.length) {
    retry = [];
    let n = 0;
    const send = async (chunk: JudgeInput[]) => {
      n++;
      const res = await callBatch(judge, chunk.map((x) => ({ id: x.id, body: judgeBody(x) })), { ...o, jobDir: OUT, onPoll: (s) => console.log(`${judge} batch ${n}: ${s}`) });
      for (const x of chunk) {
        const r = res.get(x.id);
        try {
          if (!r || r instanceof CallError) throw r ?? new Error('missing');
          const verdict = readVerdict(r.candidates[0]?.content.parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '');
          put(x.id, { id: x.id, judge, score: finalScore(verdict), verdict, usd: r.usd });
        } catch { retry.push(x); }
      }
    };
    // batches a stopped run left out go first, with exactly their own items (so they are collected, not sent again)
    const pending = pendingBatches(judge, OUT);
    const { chunks, orphans } = planBatches(xs, pending, xs.length);
    for (const p of orphans) console.log(`${judge}: batch ${p.handle} (${p.purpose}) holds items this run does not ask for; its worst case stays reserved in the ledger`);
    const collect = chunks.slice(0, pending.length - orphans.length);
    for (const chunk of collect) await send(chunk);
    // then the rest, in new batches sized just before each is sent: a batch reserves its whole worst case up front, so
    // near the cap a smaller batch still fits where 100 would be refused (and what earlier batches really cost counts)
    const taken = new Set(collect.flat().map((x) => x.id));
    const rest = xs.filter((x) => !taken.has(x.id));
    const worstItem = Math.max(0, ...rest.map((x) => batchWorstUsd(judge, judgeBody(x))));
    while (rest.length) await send(rest.splice(0, batchSizeFor(ledger, worstItem)));
  }
  for (const x of retry) {
    try { put(x.id, await judgeOne(judge, x, o)); }
    catch (e) { if (e instanceof SpendCapError) throw e; put(x.id, e as Error); }
  }
  return out;
}

interface Row { key: string; coach: string; qid: string; run: number; tfp: string; t: any }
function transcripts(): Row[] {
  const rows: Row[] = [];
  for (const dir of DIRS) for (const f of readdirSync(dir).filter((x) => /\.r\d+\.json$/.test(x))) {
    const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    if (!!t.dry !== DRY) throw new Error(`${dir}/${f} is ${t.dry ? 'from a dry run' : 'a real answer'}: ${DRY ? 'a dry judge run takes only dry transcripts' : 'point EXAM_TRANSCRIPTS at the real run\'s folder, not its dry/ folder'}`);
    const coach = String(t.model ?? dir.split('/').pop());
    rows.push({ key: `${coach}|${t.id}|r${t.run}`, coach, qid: t.id, run: t.run, tfp: transcriptPrint(t), t });
  }
  return rows;
}

it('judges the Coach exam and writes the report', async () => {
  if (!(CAP > 0)) throw new Error('set EXAM_CAP_USD (and EXAM_LEDGER to the Coach runs\' ledger, so the cap covers everything)');
  mkdirSync(OUT, { recursive: true });
  const ledger = new Ledger(DRY ? `${OUT}/ledger.jsonl` : process.env.EXAM_LEDGER ?? `${OUT}/ledger.jsonl`, CAP);
  const gates: Record<string, boolean> = {};
  const rows = transcripts(); // (read first: a wrong folder stops the run before anything is paid)

  // 1. calibration: a judge grades only after it scores the known replies right
  for (const judge of JUDGES) {
    // (the effort is part of what is calibrated: a Claude judge calibrated at one effort never grades at another)
    const tag = judge.startsWith('claude-') ? `-${EFFORT}` : '';
    const file = `${OUT}/calibration-${judge}${tag}.json`;
    const prior = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    if (prior) {
      // (the verdicts are kept, the score is not: it is recomputed with today's finalScore, so a fix to the formula
      // re-runs the gate for free and never leaves a judge passed or failed by an old formula)
      const scores = calScores(new Map(Object.entries(prior.verdicts ?? {}).filter(([, v]) => typeof v === 'object').map(([k, v]) => [k, v as Verdict])));
      const g = gate(scores);
      gates[judge] = DRY || g.pass;
      writeFileSync(file, JSON.stringify({ ...prior, gate: g, scores: Object.fromEntries(scores) }, null, 1));
      logGate(judge, g);
      continue;
    }
    if (STEP !== 'all' && STEP !== 'calibrate') continue;
    // (verdicts already paid for in a stopped calibration are kept in the .partial file and not asked again)
    const partial = `${OUT}/calibration-${judge}${tag}.partial.jsonl`;
    const res = new Map<string, Judged | Error>(lines(partial).map((l) => [l.id, l as Judged]));
    const fresh = await judgeAll(judge, CALIBRATION.map(fromCalibration).filter((x) => !res.has(x.id)), ledger, 'calibration',
      (_id, r) => { if (!(r instanceof Error)) appendFileSync(partial, `${JSON.stringify(r)}\n`); });
    for (const [k, v] of fresh) res.set(k, v);
    const scores = calScores(new Map([...res].filter(([, r]) => !(r instanceof Error)).map(([k, r]) => [k, (r as Judged).verdict])));
    const missing = CALIBRATION.filter((c) => !scores.has(c.id)).map((c) => c.id);
    if (missing.length) {
      // (not final: an error that outlived its retry is asked again next run; the good verdicts stay in .partial)
      gates[judge] = false;
      console.log(`calibration ${judge}: incomplete, no readable verdict for ${missing.join(', ')}: it grades nothing this run; run again to finish it`);
      continue;
    }
    const g = gate(scores);
    gates[judge] = DRY || g.pass;
    writeFileSync(file, JSON.stringify({ judge, effort: EFFORT, gate: g, scores: Object.fromEntries(scores), verdicts: Object.fromEntries([...res].map(([k, v]) => [k, v instanceof Error ? String(v.message) : v.verdict])) }, null, 1));
    logGate(judge, g);
  }

  // 2. the transcripts, blind: the judge sees an opaque id, never the model; same conversations together so the facts are cached
  const judgedFile = `${OUT}/judged.jsonl`;
  if ((STEP === 'all' || STEP === 'judge') && rows.length) {
    for (const judge of JUDGES) {
      if (!gates[judge]) { console.log(`${judge} did not pass calibration: it grades nothing`); continue; }
      // (done = a good verdict on this exact transcript: one judged before its answer was regenerated counts for nothing)
      const done = new Set(lines(judgedFile).filter((l) => l.judge === judge && current(l) && !l.error).map((l) => `${l.key}|${l.tfp}`));
      const todo = rows.filter((r) => !r.t.error && !done.has(`${r.key}|${r.tfp}`)).sort((a, b) => a.qid.localeCompare(b.qid));
      const byId = new Map(todo.map((r) => [opaque(`${r.key}|${r.tfp}`), r]));
      const res = await judgeAll(judge, todo.map((r) => fromTranscript(r.t, opaque(`${r.key}|${r.tfp}`))), ledger, 'exam', (id, j) => {
        const r = byId.get(id)!;
        appendFileSync(judgedFile, `${JSON.stringify({ key: r.key, tfp: r.tfp, coach: r.coach, qid: r.qid, run: r.run, judge, effort: EFFORT, ...(j instanceof Error ? { error: j.message } : { score: j.score, verdict: j.verdict, usd: j.usd }) })}\n`);
      });
      console.log(`${judge}: judged ${[...res.values()].filter((j) => !(j instanceof Error)).length} of ${todo.length}`);
    }
  }
  if (DRY) writeFileSync(`${OUT}/dry-judge-sizes.jsonl`, `${sizes.join('\n')}\n`);

  // 3. the report
  if (STEP === 'calibrate' || !rows.length) return;
  // (a transcript judged twice, after an error then a success, counts once: its last good verdict)
  // (only this run's judges at this run's effort: verdicts left by an earlier setup never enter the scores)
  // (and only verdicts on the transcript as it is now: a stale one, from before the answer was regenerated, is dropped)
  const printOf = new Map(rows.map((r) => [r.key, r.tfp]));
  // (each score is recomputed from its verdict with today's finalScore, like calibration's: one formula for both)
  const judged = [...new Map(lines(judgedFile).filter((l) => !l.error && current(l) && printOf.get(l.key) === l.tfp).map((l) => [`${l.key}|${l.judge}`, { ...l, score: finalScore(l.verdict) }])).values()];
  const answers: Answer[] = rows.map((r) => ({
    coach: r.coach, qid: r.qid, run: r.run, safety: SAFETY_IDS.test(r.qid), heldout: /^h\d/.test(r.qid),
    check: r.t.check ?? null, flags: r.t.flags ?? [], ...(r.t.error ? { error: r.t.error } : {}),
    judged: Object.fromEntries(judged.filter((l) => l.key === r.key).map((l) => [l.judge, { score: l.score, unsafe: !!l.verdict.unsafe }])),
  }));
  writeFileSync(`${OUT}/report.md`, report(rows, answers, judged, gates, ledger));
  console.log(`report: ${OUT}/report.md`);
}, 24 * 3600_000);

/** calibration case id → score, from the verdicts by `cal:<id>` (a case with no verdict is left out: the gate then fails) */
function calScores(verdicts: Map<string, Verdict>): Map<string, number> {
  return new Map(CALIBRATION.filter((c) => verdicts.has(`cal:${c.id}`)).map((c) => [c.id, finalScore(verdicts.get(`cal:${c.id}`)!)]));
}
const logGate = (judge: string, g: ReturnType<typeof gate>) => console.log(`calibration ${judge}: ${g.pass ? 'PASS' : 'FAIL'} (caps ${g.capsInRange}, others ${Math.round(g.othersInRange * 100)} %, Spearman ${g.spearman.toFixed(2)}${g.misses.length ? `; missed ${g.misses.map((m) => `${m.id}=${m.score}`).join(', ')}` : ''})`);

function report(rows: Row[], answers: Answer[], judged: any[], gates: Record<string, boolean>, ledger: Ledger): string {
  const coaches = [...new Set(rows.map((r) => r.coach))];
  const all = coaches.map((c) => modelRow(c, answers, JUDGES));
  const usdPer = (c: string) => { const xs = rows.filter((r) => r.coach === c && !r.t.error).map((r) => r.t.usd ?? 0); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN; };
  const omarFile = `${OUT}/omar-pairs.json`;
  const omar = existsSync(omarFile) ? JSON.parse(readFileSync(omarFile, 'utf8')) : null;
  const health = examHealth({ gates, all: answers, judges: JUDGES, omar });
  const cheap = all.find((r) => r.coach === 'gemini-3.8-flash'), dear = all.find((r) => r.coach === 'claude-sonnet-5-5');
  const pick = cheap && dear ? chatModel(cheap, dear) : null;
  const hard = coaches.map((c) => modelRow(c, answers, JUDGES, HARD_10));
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
    ...all.map((r) => `| ${r.coach} | ${f1(r.mean)} | ${f1(r.worst)} | ${r.under7.join(', ') || '–'} | ${f1(r.heldout)} | ${r.safetyPass}/${r.safetyTotal}${r.safetyDisagree.length ? ` (read: ${r.safetyDisagree.join(', ')})` : ''} | ${f1(r.drift)} | ${r.errors}${r.unjudged ? ` (+${r.unjudged} not judged by both)` : ''} | ${usdPer(r.coach).toFixed(4)} |`), '',
    // (read by ../checks/agent-json.ts: graded for the coaching, but in the app each was an error the person would have seen)
    '## Answer format', '',
    ...coaches.map((c) => { const xs = rows.filter((r) => r.coach === c && !r.t.error); const bad = xs.filter((r) => r.t.formatRepaired?.length); return `- ${c}: ${bad.length} of ${xs.length} answers were not a clean JSON object${bad.length ? ` (${[...new Set(bad.flatMap((r) => r.t.formatRepaired))].join(', ')}: ${bad.map((r) => `${r.qid} r${r.run}`).join(', ')})` : ''}.`; }),
    '', '- Each of these would have been an error in the app. Aven 2 must ask Claude for its answer in a form it always keeps (a tool call or a smaller strict schema).', '',
    '## The hard 10', '', '| Coach | mean | worst |', '|---|---|---|', ...hard.map((r) => `| ${r.coach} | ${f1(r.mean)} | ${f1(r.worst)} |`), '',
    '## Decisions (rules fixed before the run)', '',
    pick ? `- Chat model: **${pick.pick}** (${pick.why}).` : '- Chat model: needs both Flash and Sonnet results.',
    ...tops.map((t) => `- ${t.coach} as Coach: ${chosenHard ? (topTierWorthIt(t, chosenHard) ? `**worth it** (${f1(t.mean)} vs ${f1(chosenHard.mean)} on the hard 10)` : `not worth it (${f1(t.mean)} vs ${f1(chosenHard.mean)}; needs +0.75)`) : 'no chat model yet'}`), '',
    '## Five lowest-scored answers', '',
    ...worst.map((w) => `- ${w.qid} r${w.run}, ${w.coach}, ${w.judge}: ${w.score}. ${w.verdict.reason}${w.verdict.defects[0] ? ` First defect: "${String(w.verdict.defects[0].line).slice(0, 120)}" → ${w.verdict.defects[0].fix}` : ''}`), '',
    `Answers scored: ${answers.filter((a) => Object.keys(a.judged).length).length} of ${answers.length}; mean of all scored: ${f1(answers.filter((a) => Object.keys(a.judged).length).reduce((s, a) => s + scoreOf(a), 0) / Math.max(1, answers.filter((a) => Object.keys(a.judged).length).length))}.`, '',
  ].join('\n');
}
