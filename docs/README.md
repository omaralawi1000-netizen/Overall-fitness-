# Map of everything

Read this first to find anything. Then open only the file for the topic you're working on.

## Start here (repo)
- `docs/BRIEF.md`: the whole job. `docs/PROGRESS.md`: what's done and the exact next step.
- `docs/TASTE.md`: the tests the judges check. `docs/VISION.md`: what Aven 2 is.
- `docs/COACH.md`: the Coach rulebook. `docs/coach/ANSWER-BAR.md`: the 14 rules every Coach answer must pass, with examples; `docs/coach/VOICE.md`: how the Coach sounds. `exam/`: the Coach exam (`v1/` conversations and harness, `v2/CASES.md` the 50 cases of the Coach quality exam, `judge/` judges and report (`pairwise.ts`: the blind judge that compares two answers in both orders, checked first on the Answer Bar's own Good/Bad pairs), `checks/` code checks, `providers.ts` model calls and spend cap).
- `docs/INTERVIEW.md`: Omar's Checkpoint 1 answers. `docs/INVENTORY.md`: every old-Aven feature and what Aven 2 does with it. `docs/LESSONS.md`: lessons from old Aven.
- `docs/concepts.md`: the twelve concepts in words. `docs/blur-test-plan.md`: how blur is tested (both go when their pages in `site/` are archived).
- `.claude/agents/`: the judges. `.claude/skills/`: design and motion skills.

## Engine (logic, data and tests; no design)
- `docs/engine/SPEC.md`: the engine spec, its review and decisions. `docs/engine/PROGRESS.md`: plan, rule → test table, next step.
- `docs/engine/DATA-MODEL.md`: the data model in plain words. `docs/engine/old-logic-map.md`: every old-Aven module, port or drop.
- Code `src/engine/`, debug page `src/debug/` (live at `/engine/`), tests `tests/engine/`. `npm run verify` checks all.
- The Coach brain: `src/coach/` (`facts.ts` the one fact sheet, `actions.ts` validate → apply → verify → Undo, `untrusted.ts` untrusted input as data), tests `tests/coach/`. Rules: `docs/COACH.md` §2–3 and `docs/coach/ANSWER-BAR.md`.
- `docs/parser-examples.md`: what the instant parser reads, row by row (checked by a test). Code `src/engine/parse/`, tests `tests/parse/`.
- Browser check: `tests/e2e/engine-page.mjs` (39 checks in real Chromium; see `docs/engine/PROGRESS.md`).

## Design
- `docs/inspiration/notes.md`: what Omar likes. `docs/inspiration/web-references.md`: his web links. The numbered images are screenshots.
- `docs/inspiration/motion-library.md`: 117 watched animations in two rounds, sorted by motion job, top 3 per job, links and notes (clips and design stills in the shared folder).
- `docs/design-round-2026-11-01.md`: the final design round's decision (rules triaged, Coach ladder, navigation, two directions, PWA limits). Wins over the design bar.
- `docs/keepers.md`: ideas Omar explicitly approved after prototypes (only his yes adds one).
- `docs/taste-log.md`: every test, prototype and rejection with his reasons, in his words. Keepers = approved ideas to build from; the log = the whole history, noes included. Read it before every design round.
- `docs/research/design-bar-2026-11-01.md`: the design bar.
- `docs/research/taste-2026-11-01.md`: what Omar loves in old Aven (seven reviewers, two rounds) and the taste test link.
- `docs/history/`: old material, history not direction (`old-aven-review.md`).

## Research
- `docs/research/tech-scan-2026-11-01.md`: pricing, voice, memory, motion, food data. Its links aren't repeated in `sources/`.
- `docs/research/sources/`: link lists, one line per link, references not rules:
  `claude-code.md`, `coach-ai.md`, `health-data.md`, `food.md`, `competitors.md`, `privacy.md`.

## Live pages (`site/`, published by `.github/workflows/pages.yml`)
Base: https://omaralawi1000-netizen.github.io/Overall-fitness-/
- `/_prototypes/blind-b/` (`site/_prototypes/blind-b/`): "Cast", a workout screen built blind on 2 Nov (no taste docs, by Omar's ask): every number is liquid metal drawn by one WebGL2 canvas (`cast.js`). It melts into the next value, is re-cast white-hot when a set is logged and cools to chrome over the rest, turns gold on a record, and sinks and rises between exercises. `?rest=8` shortens every rest, `?fps` shows the frame rate.
- `/_prototypes/workout/` (`site/_prototypes/workout/`): the workout screen where the picture is this set's equipment, drawn live in 3D (the bar with the exact plates, dumbbells, or a cable stack with the pin), sharp on top and blurring into the colour field under the numbers; the depth sits one tap away. `thumbs.html` redraws the small pictures in `thumbs/`.
- `/_prototypes/heat/` (`site/_prototypes/heat/`): one workout screen in the Heat look with frosted glass and six colour themes; every moment is built from a hearted clip, and the depth (Coach, last time, all sets, whole workout, the exercise page) sits one tap away. `/_prototypes/slice/` and `/_prototypes/premium/` are the earlier workout prototypes; the rejected frost round (`/_prototypes/frost/`) stays only because `/_prototypes/today/` uses its files; the wide round is in Git history.
- `/_prototypes/blind-c/` (`site/_prototypes/blind-c/`): "Sand", a blind workout screen (2 Nov): every number is poured from lit sand grains in WebGL2, the rest countdown drains into today's strata, a record turns gold and does a medal turn. `?rest=8` shortens rests, `?lang=da` is Danish.
- `/_prototypes/window/` (`site/_prototypes/window/`): "Aven Window", the Today build of 3 Nov (v6): a real photo of Copenhagen lit by the real sun, moon and weather (`photo.jpg` + `mask.png`, one WebGL canvas), readiness as a serif word that fills with light, a draggable day arc, and Train, Fuel, Health and Coach as frosted-glass screens over the same photo, with the workout inside it. Ported from the build's `today-window.zip` (app files only; its tests and the original photo stay in the shared folder), which includes the four Codex fixes of 3 Nov. The build is still iterating, so expect updates. Photo: "Kallur lighthouse, Kalsoy, Faroe Islands" by Olegs Jonins, Unsplash. Settings are kept in memory only (no browser storage on `site/`). `?lang=da` is Danish, `?rest=8` shortens rests.
- `/round/` (`site/round/`): the final design round: Day line, Rooms and the Ordinary control.
- `/looks/` (`site/looks/`): three clickable looks, Ink, Ink rich, Heat (history: superseded by /round/).
- `/concepts/` (`site/concepts/`): the concept prototypes.
- `/blurtest/` (`site/blurtest/`): blur tests for his phone.
- `/engine/` (built from `src/debug/` into `dist/engine/`): the engine's bare debug page. Uses only `a2` storage.

## Shared project folder (outside the repo)
Lives in the project's shared folder under `aven2/`. Not in git.
- `aven2/design-review-2026-11-01/`: the design review: shared brief, three directions (light, ink, instrument), research, navigation, critic and skeptic notes.
- `aven2/taste-2026-11-01/`: the taste work: brief, debate files, 48 old-Aven screenshots, old-Aven films, round screenshots, and the taste test page source (`taste-test/`).
- `aven2/motion-evidence/`: real app recordings (Hevy, Strong, Flighty, Ladder and others), a clip and a still for each, plus `chapters.json`. Clips artifact: https://claude.ai/artifact/Sow9V4qvaMQtwmC2VLCusy
- `aven2/motion-library/`: the motion library's clips, frame sheets and per-source notes (`_brief.md` explains them). Phone page: https://claude.ai/artifact/5qeq9tDy2qe2fmJsyWVNHg
- `aven2/design-inspiration-2026-11-02/`: 33 design stills with `notes.md`.
- `aven2/research/aven2-tech-scan.html`: the tech scan as a page.
- `aven2/2026-11-01-blank-page.md` and `aven2/2026-11-01-best-six.md`: the blank-page ideas and the best six.
- `aven2/real-details.md`: Omar's real details. `aven2/removal-diff.md`: the removal diff.

Read only the reference file for the topic you're working on.
