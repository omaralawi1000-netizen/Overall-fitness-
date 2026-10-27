# Coach exam v1 (fake people only)

The 22 conversations of docs/COACH.md §8, as code. These files run inside a copy of old Aven (they import its
`src/lib` and its old exam helpers), to get the "before" score of old Aven's Coach. Phase 1 ports them to Aven 2.

- `personas-v1.ts`: fake people in old Aven's data format (omar2 is built from docs/INTERVIEW.md, no real data).
- `questions-v1.ts`: the conversations, each with what a great answer does and code checks where possible.
- `exam-v1.test.ts`: runs old Aven's real Coach (agentSystem, lookups, validation, self-check) on Gemini, keyless
  (the test environment injects the key). One call at a time, 7 s apart; waits and retries on 429/5xx.

Run: copy old Aven to a scratch folder, `npm ci`, put these three files in its `scripts/exam/`, then
`npx vitest run --config scripts/exam/vitest.config.ts scripts/exam/exam-v1.test.ts`. Output goes to
`reference/exam-v1/before/` (gitignored).

Free-tier limit found 27 Oct 2026: 20 requests a day per model. One full run needs about 30–45 calls.
