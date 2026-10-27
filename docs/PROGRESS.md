# Progress

## Session 1: repo setup (27 Oct 2026)
Done:
- docs/BRIEF.md saved word for word.
- Skills copied into .claude/skills/: frontend-design, emil-design-eng, apple-design, animation-performance, mobile-native, prototype, review-animations, verification-before-completion, grill-me. Plus grilling, because grill-me only says "call grilling" and would do nothing without it.
- Judges in .claude/agents/: design-judge, motion-judge, coach-judge (read-only).
- docs/TASTE.md (the brief's Design and Firm rules, as a rulebook for the judges).
- CLAUDE.md.
- docs/inspiration/: 3 key frames from each of the 26 videos in the "inspiration" release (the release has no pictures). Videos are not committed.
- docs/inspiration/web-references.md: Omar's 15 web references, each fetched, with what was learned (Medium post and Ripplix clips were blocked).
- docs/inspiration/notes.md: one entry per video, grouped by theme. Omar confirmed the list on 27 Oct ("It's fine").

Problems found:
- Gemini: set and working (checked 27 Oct after Omar switched the environment). There is no GEMINI_API_KEY variable; the environment injects the key as the x-goog-api-key header on requests to generativelanguage.googleapis.com, so send requests without a key. A test call to gemini-3.8-flash answered. Note: gemini-2.5-flash now returns 404 ("no longer available to new users"), so use gemini-3.8-flash.
- Downloading release assets: `gh release download` fails (GraphQL is blocked in cloud sessions). Use the REST API: `gh api -H "Accept: application/octet-stream" repos/omaralawi1000-netizen/Overall-fitness-/releases/assets/<id>`.

## Next step
Open a new session and say "Start Phase 0". That session begins with Checkpoint 1, step 1 (the interview), after cloning the old app into reference/aven and reading it.

## Session 2: Phase 0, Checkpoint 1 (27 Oct 2026)
Done:
- Brief: free-tier Gemini pacing, retry on 429, gemini-3.8-flash.
- Old app cloned into reference/aven (gitignored) and read in full: all docs, every file in src/, android/, tests and the
  Coach exam. Read-through notes in reference/notes/A–D (gitignored, local only).
- Interview: 12 questions, answers and decisions in docs/INTERVIEW.md. Big decision: Aven 2 is for anyone (Omar's
  friends, every type, Android and iPhone, own key or none); nothing about Omar is hardcoded; onboarding is a talk with
  the Coach.
- docs/INVENTORY.md (every old feature: keep/merge/cut/later), docs/LESSONS.md, docs/VISION.md, docs/COACH.md (incl.
  exam v1: 22 conversations, target ≥ 8.5).
- Found: old Aven's "Delete everything" wipes every localStorage key starting with `aven`, so an `aven2` prefix is at
  risk (INTERVIEW.md). Omar chose `a2`.

- Old Aven seen running at 384 px (docs/inspiration/old-aven-review.md).
- Exam v1 harness committed (exam/v1/, fake people only).

Blocked:
- Exam v1 "before" run: free Gemini tier is 20 requests/day per model and was used up on 27 Oct. Re-run after the daily
  reset (~08:00 Copenhagen) in a copy of old Aven (exam/v1/README.md), over 1–2 days; then fresh coach-judges score it
  and the numbers go into COACH.md §8.

Checkpoint 1 approved (Omar, 27 Oct, 18:07): go; yes to cuts 1–6; storage prefix `a2`; three changes written into
BRIEF, VISION, COACH and INVENTORY (instant logging without the AI, file backup in the first build phase, watch and
Health Connect right after the core loop). Real Gemini limits checked (COACH.md §7): the test key here is free tier
(20/day per model), Omar's daily key has billing.

## Next step
Checkpoint 2 step 7: the GitHub Pages deploy workflow. In parallel, the exam baseline when the test key's quota resets
(~08:00 Copenhagen, 28 Oct), then fresh coach-judges and COACH.md §8.
