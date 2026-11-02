# Engine progress

Spec and review: `SPEC.md`. Data model: `DATA-MODEL.md`. Old code map: `old-logic-map.md`.
Branch: `claude/project-thread-dkkklx`. The main `docs/PROGRESS.md` is for design; engine progress lives here only.

## Merge rule
Merge an engine PR only when `npm run verify` is green **and** Codex's review of it has finished. Fix or answer every finding first. Codex (the `chatgpt-codex-connector` bot on GitHub) reviews when a PR is opened **and again after every push**, so wait for the review of the last commit (its summary comment shows the commit and "Completed"). If it hasn't finished within about 15 minutes, merge on a green `verify`. PR #44 was merged while Codex was still reviewing, and it found 4 real bugs afterwards (fixed in #45).

## Plan
| Part | What | Model | Phone check |
|---|---|---|---|
| Step 0 | `old-logic-map.md` | Opus | none (a document) |
| E1a-1 | `DATA-MODEL.md`; storage under `a2`; one action log; exactly-once; Undo with conflict check; soft deletes; derived-fact invalidation; save states; rest timer by end time; update gate | Opus | log sets on `/engine/`, reload mid-rest, double-tap, Undo |
| E1a-2 | schema versions and migrations; backup export with checksum; restore with preview, merge or replace, last-known-good; corrupt and half files; import from old Aven (file and same-site copy) with a dry-run report and one-action Undo; isolation tests | Opus | export, restore, import his real old backup and read the report |
| E1a-3 | `/engine/` debug page; `npm run verify`; code review; untested list | Opus | the whole page |
| E1b | parser (sets, food words, water, bodyweight), `docs/parser-examples.md`, phrase box on `/engine/` | **Sonnet main**, Opus advisor | type or dictate phrases |
| E2 (proposal) | fix the Coach exam; test Haiku 5.5 vs Gemini on his real kinds of conversations | later | |

## Rule → proof
Tests live in `tests/engine/`. "untested" is said plainly.

| Rule | Proof | Status |
|---|---|---|
| Day start: a 01:30 snack with a 04:00 start is yesterday; time zones; clock-change night | `time-units` (ported + new, 2 property tests) | tested |
| Units: kg/lb round trip, "82,5" and "82.5" | `time-units` (ported + 2 property tests) | tested |
| Every record has time, zone, day, source, schema version | `engine` "a change and its action land together" | tested |
| One action log; records and action in one transaction | `engine` "action log" block | tested |
| Exactly once: same tap id twice, two tabs at once, any mix of repeated taps | `engine` (incl. a property test) | tested |
| A double tap on a set logs once and starts one rest | `workout` | tested |
| Multi-step changes all or nothing | `engine` "a multi-step change", restore "fails half-way" | tested |
| Undo reverses only its own change; stops on conflict; never restores a whole old state | `engine` Undo block, `workout` "undoing set 1 never touches set 2" | tested |
| apply → undo sequences return to the start | `engine` property test (40 random runs) | tested |
| Deletes are soft | `engine` | tested |
| Deleting or correcting a fact makes what was built on it stale (chains); no mix of edits, Undos and recounts makes an old value look fresh | `engine` "derived facts" (incl. a property test, 60 random runs) | tested with a stand-in summary; real summaries come with the Coach |
| Never "saved" while pending or failed; full disk rolls back and waits with Retry | `engine` "saving states" (quota error injected) | tested in Node; a real full phone untested |
| Session states planned/active/paused/resumed/abandoned/discarded/deleted; discarded never comes back on reload | `workout` | tested |
| Planned vs done kept apart; unticked never counted as done (also on import) | `workout`, `backup-import` | tested |
| Rest timer stores the end time; reload, pause/resume, ±15, Skip; never jumps back | `workout` (incl. a property test); page check in headless Chrome (1:29 before and after reload) | tested |
| No app update during a workout or a pending save | `workout` "app updates" (`updateAllowed`) | rule tested; not wired, no service worker yet (app-shell phase) |
| IndexedDB under `a2` only; refuses other names | `isolation` | tested |
| Old Aven's "Delete everything" and Beta's copy can't touch a2 | `isolation` (old code replayed from a copied fixture) | tested |
| Aven 2's delete-everything removes only a2 | `isolation` | tested |
| Separate offline cache and service-worker scope | none | untested: no service worker yet (paths already differ: `/Overall-fitness-/` vs `/The-new-Claude-gym-app/`) |
| Persistent storage asked once there is data | `engine` "persistent storage" | tested with a fake browser; the real grant needs the phone |
| Data from a newer version opens read-only | `engine` "schema and snapshots" | tested |
| Migrations deterministic and repeatable; last-known-good copy before migration, restore, import | `backup-import` "migrations", `engine` snapshots | tested (no real migration exists yet: schema 1) |
| Backup: versioned, checksum; damaged, cut-off, edited, wrong, newer files refused | `backup-import` | tested |
| Restore: preview, merge (newer wins, phone deletes stay), replace (also removes what another tab just added), one Undo | `backup-import` | tested |
| Import from old Aven: file and one-tap copy, read only, dry-run report, skipped with reasons, damaged items counted | `backup-import`; page check in headless Chrome with a made-up old Aven on the same site (`aven.v1` unchanged) | tested |
| Re-import never duplicates; deleted here stays deleted; one Undo takes the import back | `backup-import` | tested |
| Missing is never zero (food nutrients, watch numbers) | `backup-import` (import), model types | tested on import; sums come with the Food phase |
| A logged day isn't assumed complete | `dayNote.foodComplete` in the model | shape only: averages come with the Food phase |
| Exercise variations are separate exercises | catalogue keeps one id per variation | shape only: records and plateaus come with the Workout phase |
| Memory cards (scope, valid-from/until, last-seen) and the Coach ladder | model types, import of old memory notes | shape only: used in the Coach phase |

## Test inventory (78 tests)
Fewer tests than rules looks thin, but each property test runs 25 to 200 random cases, so the real count of checked cases is in the thousands.

**Property tests (12):**
- Dedupe: any mix of repeated taps logs each action once (`engine`).
- apply → undo: 40 random histories, then Undo all, ends where it started (`engine`).
- Derived facts: random edits, deletes, Undos and recounts never leave a summary fresh unless it saw the facts exactly as they are (`engine`).
- Rest timer: any reload or ±15 pattern never jumps back (`workout`).
- Day keys and `addDays`/`diffDays`; every moment maps to a real day; kg ↔ lb; `parseNum` with comma or point (`time-units`).
- Backup: export → read → replace on another phone gives the same data for any history; restoring the same file twice changes nothing; any edited number fails the checksum (`backup-import`).
- Old import: half-broken or hand-edited old data never crashes the import (`backup-import`, 200 cases).

**Old tests ported as regressions (9 tests):**
- `core.test.ts` "dates & units", 6 tests (`time-units`). Its 7th, "percentages follow the language", is screen text and was not ported.
- `core.test.ts` "elapsed excludes paused time" (`workout`).
- `beta.test.ts`: its rules (writes only `beta:` keys, copies only `aven…` keys, deletes only its own) are replayed with old Beta's real code next to `a2` data, in 2 tests (`isolation`).
- `behaviour2.test.ts` "a hand-edited backup never crashes" becomes the import property test above.
- E1b ports: listed in `old-logic-map.md`.

**Still untested:** see below.

## Browser check (real Chromium, made-up data)
`node --experimental-strip-types tests/e2e/engine-page.mjs [url]` runs 25 checks on the `/engine/` page (default: the live page) in fresh browser profiles:
- Import from old Aven, then reload: the workout and food are listed, old Aven is unchanged, and importing again adds nothing.
- Export, delete everything, then restore with a preview; an edited file is refused.
- A double tap on Tick ticks once.
- The rest timer survives a reload, +15 s, and pause with a reload.
- Undo survives a reload.
- Two tabs both save and both show each other's ticks.
- The browser killed with SIGKILL in the middle of an import leaves all or nothing, never half (8 runs).

Run it after every page or engine change, and again against the live page after the deploy. Omar is asked only for what needs his own phone or his own file.

## What's still untested or open
- Real phone: persistent-storage grant (headless Chrome always says no), a truly full disk, IndexedDB under memory pressure. A killed browser mid-write is now tested in real Chromium, not on Android.
- No service worker yet, so "no update mid-workout" and cache separation are rules without wiring.
- Old Aven's real backup format was tested with a made-up file built from its types; Omar's own file is the real test.

## Done
- Step 0 (2 Nov): `old-logic-map.md`.
- E1a-1 (2 Nov): `DATA-MODEL.md`, `src/engine/` model, plan (pure action logic), engine (IndexedDB, action log, Undo), workout and timers, isolation tests.
- E1a-2 (2 Nov): backup, restore, migrations, import from old Aven, exercise catalogue ported.
- E1a-3 (2 Nov): debug page at `/engine/` (`src/debug/`), checked in headless Chrome at 384 px.
- Code review (2 Nov): 10 fixes, 68 tests green. Merged to main in PR #44 and deployed to `/engine/`.
- Codex review of PR #44 (2 Nov, after the merge): 4 real findings, all reproduced by a failing test, then fixed: undoing a creation now stops if a field was added since; Undo never makes a stale summary look fresh; a repeated tap after a newer change shows the database; replace also removes records another tab just added. Codex's look at #45 found a 5th: Undo also restored an old `stale` value when the change touched other fields too; fixed the same way. Its look at that fix found a 6th (#45 was merged before that look finished, against this rule): undoing a recount left the old value looking fresh; now it comes back stale (#46). Three staleness bugs in a row meant the design was wrong: a stored `stale` flag that Undo had to treat specially. Redesigned in #46: staleness is worked out from the stamps of the facts (`derived.ts`; a stamp is the id of the write that made a state, unique across phones) and never stored, so Undo needs no special case; a property test checks random edit/delete/Undo/recount runs. Codex's review of the redesign found 3 more edge cases (a shared ancestor read as a loop, older derived records, equal revision numbers on two phones), all fixed with tests; revision counters were replaced by stamps for that. Plus 5 property tests and 1 ported test (77 tests).

## Next step
E1b on **Sonnet** (Omar switches the model): the parser and `docs/parser-examples.md`, then a phrase box on `/engine/`.
Start from `old-logic-map.md` "Port now" E1b rows and the self-correction rule in `SPEC.md` (contradiction 3).
