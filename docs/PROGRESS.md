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
  risk (INTERVIEW.md, last section). Needs Omar's call.

In progress:
- Exam v1 "before" run of old Aven's Coach on gemini-3.8-flash (transcripts in reference/exam-v1/before/, harness
  sources in reference/exam-v1/src/ to port into scripts/exam/ in Phase 1). Then fresh coach-judges score it, and the
  baseline goes into COACH.md §8.

## Next step
Send Omar the Checkpoint 1 message (vision in a few lines, stack recommendation, cuts and merges that need his yes,
decisions only he can make) and wait for his go. Open question from him: whether to open old Aven at phone width with
test data and look at every screen before Checkpoint 2.
