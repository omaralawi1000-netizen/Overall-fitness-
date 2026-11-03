# Coach exam v1 (fake people only)

The conversations of docs/COACH.md §8, as code. These files run inside a copy of old Aven (they import its `src/lib`),
to get the "before" score of old Aven's Coach and to choose the Coach model (E2 plan v2). Phase 1 ports them to Aven 2.

- `personas-v1.ts`: fake people in old Aven's data format (jonas is made up; his week only has the shape of the interview, no real data).
- `questions-v1.ts`: the 22 conversations, each with what a great answer does and code checks where possible.
- `questions-safety.ts`: 8 safety probes, each run 5 times.
- `HELDOUT.sha256`: the fingerprint of the 10 held-out conversations, which live outside the repo. The harness refuses a changed file.
- `exam-v1.test.ts`: runs old Aven's real Coach (agentSystem, look-ups, validation, self-check) on any Gemini or Claude
  model through `../providers.ts`. Paced and retried; a spend cap and a shared ledger stop it before it overspends.

## Run (old Aven copy)
1. Copy old Aven to a scratch folder (`git archive HEAD | tar -x -C <scratch>`), `npm ci`,
   `npm i --no-save @anthropic-ai/sdk@0.137.0`.
2. Copy this repo's `exam/` into it with `v1` renamed to `exam`: `exam/v1/*` → `scripts/exam/`, `exam/checks/` →
   `scripts/checks/`, `exam/providers.ts` → `scripts/providers.ts`; for the held-out run also the held-out file → `scripts/exam/`.
3. Dry run first (free; writes each call's size and worst-case price to `dry-sizes.jsonl`):
   `EXAM_DRY=1 EXAM_MODEL=claude-sonnet-5-5 EXAM_OUT=<dir> npx vitest run --config scripts/exam/vitest.config.ts scripts/exam/exam-v1.test.ts`
4. Real run, one Coach model at a time, all sharing one ledger:
   `EXAM_MODEL=gemini-3.8-flash EXAM_RUNS=2 EXAM_HELDOUT=1 EXAM_CAP_USD=38 EXAM_LEDGER=<dir>/ledger.jsonl EXAM_GAP_MS=1000 EXAM_OUT=<dir>/gemini-3.8-flash npx vitest run …`
   Top tier on the hard 10 only: `EXAM_ONLY=<the HARD_10 ids in exam/judge/report.ts>`.
   Keys come from the environment: `GEMINI_API_KEY` (or a proxy that adds it), `AVEN_ANTHROPIC_KEY` or `ANTHROPIC_API_KEY`.
   A stopped run resumes: answers already written are kept, errors are redone.

## Judge and report (this repo)
`EXAM_TRANSCRIPTS=<dir>/gemini-3.8-flash,<dir>/claude-sonnet-5-5,… EXAM_CAP_USD=38 EXAM_LEDGER=<dir>/ledger.jsonl EXAM_JUDGED=<dir>/judged npx vitest run --config exam/vitest.config.ts exam/judge/run-judges.test.ts`
Calibration first (a judge that fails grades nothing), then both judges through the half-price batch APIs, then
`report.md` with the decision rules of the E2 plan. Omar's blind pairs go in `<judged>/omar-pairs.json` as `{"agree": n, "of": 12}`.

Measured in the dry run (3 Nov 2026): old Aven's Coach prompt is about 75–90k characters (about 20k tokens) per call,
the judge's about 25k characters. Claude reads the stable part of the Coach prompt from its cache; Gemini caches it by itself.
