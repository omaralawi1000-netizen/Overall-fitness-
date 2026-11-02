# Old Aven's logic: what the engine takes

Step 0 of the engine (`SPEC.md`). Every module in old Aven's `src/lib` (live branch `ccr-d1172cc7-1e03wh`, v0.1.185,
74 files, 15.6k lines), plus the data and state files the engine needs. Read-only: nothing in old Aven changes.

- **port now**: E1 needs it. Ported with its tests, adapted to the new data model (`DATA-MODEL.md`).
- **port later**: wanted, in the named phase. Ported then, with its tests.
- **keep (idea)**: the behaviour is wanted, but the code is tied to old Aven's store or screens, so it is rewritten.
- **drop**: tied to old screens, old styling or glow code, or replaced.

An old test is ported only if its behaviour is still wanted. Old tests that check old screens are not ported.

## Port now (E1)
| Module | Lines | Part | Why |
|---|---|---|---|
| `units.ts` | 64 | E1a | kg/lb, km/mi, cm/in and `parseNum` ("82,5" and "82.5"). Pure and tested. Number formatting comes along for the debug page. |
| `dates.ts` | 82 | E1a | Day keys with the person's day start, add/diff days, week start. Pure. Adapted: the day key takes a time zone, so a record keeps the day it was logged into wherever the phone is. |
| `derive.ts` | 87 | E1a | Only the day-boundary rules: "today" under a 04:00 day start, and the late-snack meal default. Its React hooks are dropped. |
| `backup.ts` | 31 | E1a | Old Aven's backup format (`{ app: 'aven', v, exportedAt, data, chat?, photos? }`): the importer reads it. Aven 2 writes its own format (`a2-backup`, with a checksum). |
| `persist.ts` | 38 | E1a | Asking for persistent storage once there is real data. Its hooks and its `aven.lastBackup` key are dropped (Aven 2 keeps its own under `a2`). |
| `beta.ts` | 117 | E1a | Not ported as code. Read to prove isolation: old Beta copies only `aven…` keys and writes only `beta:` keys. The isolation tests replay its key rules against `a2` data. |
| `types.ts` | 501 | E1a | The old data shape the importer reads. The new model (`DATA-MODEL.md`) is written fresh from it: planned vs done sets, session states, sport sessions, sources, time zones, schema versions. |
| `state/defaults.ts` | 111 | E1a | `normaliseData`: the defensive reading of an old or hand-edited backup. The importer uses the same care. |
| `data/exercises*.ts` | 400 | E1a | The exercise catalogue (about 120 lifts, English and Danish names). Old workouts refer to these ids, so they stay. Variations (machine, grip, range of motion) are already separate entries; the new model adds which ones are siblings. |
| `setCommand.ts` | 116 | E1b, done | "8 at 80", "80 for 8", Danish number words, "same again", done, skip, rest, undo, a dropped digit (`guardSet`, `fixMisheard`). Changed: a bare "no" inside a phrase becomes a self-correction ("80… no, 60"), not Undo. |
| `workoutText.ts` | 144 | E1b | Whole-workout dictation ("80 for 8, 8 and 6", "3 sets of 8 at 80", "then"), and lift nicknames (bench, RDL, bænk). |
| `foodText.ts` | 422 | E1b | Only the word side: folding æøå, splitting "200 g skyr og to æg", amounts, units, counted words, density, estimate flags. Food search and resolving to a database food are port later (Food phase). |

Note on `da.ts` (the spec listed it with the parsers): it is old Aven's table of Danish **screen text** (2,109 lines), not
a parser. The Danish words the parsers need (number words, "gange", "på", "spring over") live inside the parsers and come
with them. The screen text is rewritten with the new screens; only its mechanism is kept (see `i18n.ts`).

## Port later
| Module | Lines | Phase | Why |
|---|---|---|---|
| `nutrition.ts` | 283 | Food | Quantities, scaling, recipes, linked macro targets. Clean and well tested (`core.test.ts`). |
| `format.ts` | 52 | Food | "At least" sums when a nutrient is missing. |
| `foodApi.ts` | 183 | Food | Open Food Facts and the packed Danish list. Network: not in E1. |
| `data/foods*.ts`, `foodDef.ts` | 707 | Food | 601 built-in foods (English and Danish). |
| `barcode.ts` | 32 | Food | Native reader, then ZXing. |
| `eating.ts` | 318 | Coach | Heavy days and catch-up maths. Becomes the Coach's judgement per person (INVENTORY). |
| `eatingWatch.ts`, `verdict.ts` | 266 | Coach | When a heavy day is noticed and decided. Logic kept, rewritten into the Noticer. |
| `maintenance.ts` | 93 | Coach | True maintenance from logs and the scale. |
| `dataQuality.ts` | 113 | Coach | Spotting unfinished days and odd entries before averaging. |
| `stats.ts` | 195 | Progress | Weight trend, streaks, weekly review numbers. |
| `scores.ts` | 209 | Health | Sleep and Ready scores against your own normal. |
| `recovery.ts` | 99 | Coach | Sleep and recovery lines for the fact sheet. |
| `goals.ts` | 762 | Coach | Goals with pace (living-coach step 2). Big but tested (`goals.test.ts`, 66 tests). |
| `workout.ts` | 320 | Workout | Records, e1RM, progression, paused time. Clean and tested. E1 uses only "paused time" (ported with the timer rules). |
| `planDay.ts` | 81 | Coach | "Chest and triceps tomorrow" from your own lifts. |
| `starter.ts` | 89 | Onboarding | Starter plans. Its import from an old screen file is removed. |
| `person.ts` | 77 | Coach | Your own patterns, worked out from your data. |
| `ledger.ts` | 100 | Coach | Learning from what you undo, move or swap. The engine's action log is where those signals will come from. |
| `coachContext.ts` | 502 | Coach | The fact sheet. Rebuilt as structured facts (COACH.md §2). |
| `coachWorkout.ts` | 108 | Coach | Lines around a workout. Its "never lighter" rule becomes a learned preference. |
| `nudges.ts` | 361 | Coach | Candidates for the Noticer. |
| `weekReview.ts` | 135 | Coach | Sunday review numbers. |
| `agent.ts` | 2588 | Coach | The 56 actions. Rewritten as one tested action layer on the engine's action log (COACH.md §3). |
| `agentLookup.ts`, `lookupKinds.ts`, `agentCharts.ts` | 495 | Coach | Look-ups and charts from your own data. |
| `agentTurn.ts`, `brain.ts`, `gemini.ts`, `openai.ts`, `aiValidate.ts`, `answerCheck.ts` | 1445 | Coach / E2 | AI clients, strict output checks, "the reply must not claim what the actions didn't do". E2 tests Haiku 5.5 vs Gemini. |
| `handbook.ts` | 65 | Coach | The coaching handbook the model looks things up in. |
| `settingSpec.ts` | 86 | Coach | Every setting the Coach may change, in one table. |
| `askAbout.ts` | 91 | Coach | "Ask the Coach about this". Its icon import is dropped. |
| `archive.ts` | 122 | Coach | The whole conversation kept on the phone. The importer lists the old chat as "skipped, comes with the Coach phase". |
| `thread.ts` | 123 | Coach | One conversation for the orb and the Coach (Omar, 2 Nov: noted in INVENTORY). |
| `spend.ts`, `trouble.ts` | 94 | Coach | Spend limit and "how the Coach is doing". |
| `keys.ts` | 23 | Coach | Keys in their own storage key, never in data or backups. Re-done under `a2`. |
| `groq.ts`, `speech.ts`, `mic.ts`, `tts.ts`, `voiceOut.ts` | 848 | Voice | Speech in and out. LESSONS 11–17 apply. |
| `audioprep.ts` | 91 | Voice | Clean the recording before speech-to-text (Whisper invents words in silence). Noted in LESSONS. |
| `sttNames.ts` | 11 | Voice | Your own lifts and foods as hints to speech-to-text. Noted in INVENTORY. |
| `healthSync.ts`, `watchDetail.ts`, `hcWrite.ts`, `activity.ts` | 573 | Android | Health Connect in and out. Validation code ports as is. |
| `androidApp.ts` | 116 | Android | Native rest countdown. |
| `drive.ts` | 220 | later | Google Drive backup (INVENTORY: later). |
| `photos.ts` | 51 | Progress | Progress photos on the phone only. The importer lists them as "skipped, comes with Progress". |
| `i18n.ts` | 47 | App shell | Danish strings load separately so English opens fast. Noted in LESSONS. |
| `hooks.ts` | 83 | App shell | The rule "screens behind the live workout never redraw per tick", and the first-frame rule (a timer shows the right number on its first frame). The rule is kept; the React code is redone. |
| `reveal.ts` | 35 | Coach UI | Word-by-word reply timing (pure). The look is redesigned. |
| `currentSet.ts` | 47 | Workout | Which set is current. The parser's "current exercise" context replaces it in E1b. |
| `demo.ts` | 74 | later | Demo data (INVENTORY: later). |

## Drop
| Module | Lines | Why |
|---|---|---|
| `grain.ts` | 84 | Old glow/grain machinery (BRIEF: don't port the glow/dither code). |
| `stutter.ts` | 61 | Old stutter recorder tied to old screens; a new one comes with the developer menu if needed. |
| `coachTrace.ts` | 70 | Temporary diagnostics for an old orb freeze. |
| `photoOpen.ts` | 11 | Wires old camera buttons to old screens. |
| `da.ts` | 2109 | Old screen text. New screens bring their own strings (see note above). |

## Old tests ported in E1
| Old test | What it proves | Part |
|---|---|---|
| `core.test.ts` "dates & units" (6 tests; the 7th is screen text) and "elapsed excludes paused time" | day start shifts late-night logging back a day, DST and month ends, week starts, both decimal separators, kg/lb round trip | E1a |
| `beta.test.ts` (its 4 tests' rules, replayed in 2 isolation tests) | old Beta writes only `beta:` keys and copies only `aven…` keys; replayed with `a2` data present to prove it is never touched | E1a |
| `handsfree.test.ts` (4 tests) | reading a set in both languages; same, done, skip, rest, undo; anything else ignored; a dropped digit is asked about | E1b |
| `train2.test.ts` `fixMisheard` (1 test, 7 checks) | 18 → 80 when 80 is the usual; a real lighter day stays | E1b |
| `core.test.ts` "dictation: food / workout" (word-side only) and "quantities" (ml ≠ g, density, estimates) | E1b |
| `corrections.test.ts` `rowQuantity` (portion stand-ins never become "10 × 100 g") | E1b |
