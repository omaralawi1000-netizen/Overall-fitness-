# Engine progress

Spec and review: `SPEC.md`. Data model: `DATA-MODEL.md`. Old code map: `old-logic-map.md`.
Branch: `claude/project-thread-dkkklx`. The main `docs/PROGRESS.md` is for design; engine progress lives here only.

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
Filled in as each rule gets its test. "untested" is said plainly.

| Rule | Proof | Status |
|---|---|---|

## Next step
Step 0: write `old-logic-map.md`.
