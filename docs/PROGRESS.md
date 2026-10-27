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
