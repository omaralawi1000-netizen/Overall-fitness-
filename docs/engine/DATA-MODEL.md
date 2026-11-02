# Aven 2 data model (engine E1a)

Plain words first, then the exact shape. Code: `src/engine/model.ts`. One person per phone, no accounts. Everything lives
on the phone in IndexedDB under the `a2` prefix (`a2.data`), never under `aven…` (old Aven's "Delete everything" wipes
those).

## 1. Every record carries the same envelope
Whatever it is (a set, a meal, a memory card), a record has:

| Field | Meaning |
|---|---|
| `id` | Unique. Made on the phone when the thing is created. Imported records use `old:<kind>:<old id>`, so a second import finds them. |
| `kind` | What it is (§3). |
| `v` | The schema version it was written with. |
| `at` | When it happened, in milliseconds since 1970 (UTC). |
| `tz` | The phone's time zone when it happened (`Europe/Copenhagen`). With `at` it gives the exact local time. |
| `day` | The day it belongs to (`2026-11-02`), worked out with the person's day start when logged, or chosen by them ("log into yesterday"). Changing the day start later never moves old records. |
| `source` | Who made it: `tap`, `voice`, `coach`, `import`, `watch` or `system`. |
| `createdAt`, `updatedAt` | Bookkeeping times. |
| `rev` | Goes up by one on every change. |
| `deleted` | Present when deleted: `{ at, by }` (the action that deleted it). Deletes are soft: the record stays, hidden. |
| `basedOn` | For anything derived (a summary, a reminder, a Coach notice): the ids it was built from. |
| `stale` | Set when one of those facts was deleted or changed: the derived thing must be rebuilt or not shown. |

**Units.** Every number field has one fixed unit, written in its name or in the table below: kg, g, ml, kcal, seconds,
metres, cm. Nothing is ever stored in lb, dl or minutes. When someone typed another unit, what they typed is kept beside
it as `entered: { value, unit }` ("180 lb"), so the app can show it back the way they said it.

**Missing is never zero.** A field that is absent means "not known": a nutrient a food doesn't list, a night the watch
didn't record, reps not typed yet. Sums over unknowns say "at least". No code fills a gap with 0.

## 2. Time
- `at` + `tz` is the truth; `day` is decided once, when the record is made.
- **Day start.** The person sets when their day starts (0–6 o'clock). With a 04:00 start, a snack at 01:30 belongs to
  yesterday (ported from old Aven's `dates.ts`/`derive.ts`, now time-zone aware).
- **Logging into yesterday** the next morning sets `day` to yesterday and keeps `at` as the real time it was logged.
- **Corrections recalculate.** Nothing stores a total that could go stale without saying so: day totals are computed from
  the records when asked; anything that is stored (a summary) lists its `basedOn` and is marked `stale` when a source
  changes.
- **Timers** store end times, never a countdown (§5).

## 3. The kinds

### Training
**`session`**: one workout.
- `state`: `planned`, `active`, `paused`, `finished`, `abandoned` or `discarded` (plus `deleted` from the envelope).
  "Resumed" is the move from `paused` back to `active`; every move is kept in `events: [{ type, at }]` (`plan`, `start`,
  `pause`, `resume`, `finish`, `abandon`, `discard`), so the whole story is visible.
  - **abandoned**: left unfinished (the person stopped, or it sat untouched too long and they said so). What was done
    stays as history.
  - **discarded**: thrown away by the person. Hidden everywhere, never counted, never offered back on start-up. It comes
    back only through Undo on the discard action, which is visible in the history.
  - **deleted**: a finished workout removed later (soft).
- `name`, `routineId?`, `plannedDay?`, `startedAt?`, `endedAt?`, `pausedMs` (total paused so far), `pausedAt?`.
- `rest`: the rest timer, or absent: `{ startedAt, endsAt, totalSec, afterSetId?, pausedLeftMs? }`.
- **Drafts**: a session that is `active` or `paused` is the draft. On start-up it is offered openly ("Workout in progress:
  resume, finish or discard"), never resumed silently, and nothing is filled in for sets that weren't ticked.

**`slot`**: one exercise in a session, in order. `sessionId`, `exerciseId`, `order`, `note?`, `restSec?`, `supersetGroup?`.

**`set`**: one set. `sessionId`, `slotId`, `order`, `type` (`warmup` or `working`).
- `planned?`: what the plan asked for: `{ reps?, repMin?, repMax?, kg?, durationSec?, distanceM? }`.
- `done?`: what really happened, present only after the tick: `{ reps?, kg?, durationSec?, distanceM?, rpe?, rir?, at }`.
- `skipped?`: `true` when skipped on purpose.
- Planned and done are separate on purpose: "planned 8 × 80, did 6 × 80" stays true forever.

Sets and slots are their own records (not a list inside the session) so that each tick is its own small change: undoing
set 2 can never touch set 3.

**`exercise`**: a custom exercise. The built-in catalogue (about 120, English and Danish names, ids kept from old Aven)
is code, not data. Every exercise has `family` (the movement, e.g. `bench-press`) and `variant` (equipment, grip, angle,
range of motion). **A variation is a separate exercise with its own id**: incline dumbbell press, machine press and barbell
bench are three exercises in one family. Records, plateaus and progress compare only the same id; the family is only for
"swap for" and grouping.

**`activity`**: anything that isn't a lifting workout, including **sport sessions**. `type`: `wrestling`, `run`, `walk`,
`cycle`, `swim`, `row`, `hike`, `mobility`, `other`. Wrestling is the first sport, not a special case. `durationSec`,
`startAt?`, `distanceM?`, `rounds?`, `intensity?` (1 easy, 2 hard, 3 max), `kcal?` (watch, shown only, never added to
food), `avgHr?`, `maxHr?`, `note?`, `name?`.

**`routine`** and **`plan`**: the plan. A routine is `{ name, items: [{ id, exerciseId, warmupSets, workingSets, repMin,
repMax, restSec, supersetGroup?, note? }] }`. The plan is one record (`id: plan`) with the weekly days, rotation, one-off
moves and sport days (old Aven's `Schedule`). A multi-step plan edit is one action, so it lands whole or not at all.

### Food and body
**`food`**: one logged food.
- `name`, `meal` (breakfast, lunch, dinner, snacks or the person's own).
- `foodRef?`: which food in a library it came from, when one did.
- `dataSource`: where the numbers came from: `reference` (built-in list), `off` (Open Food Facts), `custom`, `recipe`,
  `quick` (typed calories), `estimate` (an AI or a typical portion).
- `portion`: what was said: `{ amount, unit: 'g' | 'ml' | 'piece' | 'portion', label?, countWord? }`. "2 æg" stays 2
  pieces; "et glas mælk" is 1 glass.
- `grams?` or `ml?`: the amount in the food's own basis, only when known. 1 ml is never assumed to be 1 g: ml becomes g
  only with a known density.
- `state?`: `raw`, `cooked` or `dry`.
- `estimated`: `true` whenever the amount or the numbers are not verified (a typical portion, "one banana" dictated, an
  AI estimate).
- `nutrients`: `{ kcal?, protein?, carbs?, fat?, fibre?, sugar?, satFat?, sodium? }` for this entry. Any key may be
  missing = unknown.

**`dayNote`** (`id: day:<day>`): what is known about a day as a whole. `foodComplete?: true` only when the person (or the
Coach, with their yes) says the day's log is complete. **A day with food logged is not assumed to be a complete day**;
averages skip days not marked complete, or say they're partial.

**`water`**: `ml`. **`bodyweight`**: `kg` (+ `entered` when typed in lb). **`measurement`**: `kind` (waist, chest, hips,
arm, thigh, neck), `cm`.

### Health (for the watch later)
**`sleep`**: one night or nap. `start`, `end` (ms), `minutes?`, `deepMin?`, `remMin?`, `lightMin?`, `awakeMin?`.
**`healthDay`** (`id: health:<day>`): the watch's numbers for a day, every one optional: `steps?`, `activeKcal?`,
`restHr?`, `hrv?`, `spo2?`, `respRate?`, `vo2max?`, `bodyFat?`, and so on. A missing night or number is simply absent.

### The Coach (shapes now, used in the Coach phase)
**`memory`**: one memory card (COACH.md §1, with the §11 fixes).
- `text` (the person's words), `topic`: `about`, `goal`, `promise`, `preference`, `health`, `life`.
- `scope`: `standing` (true until changed) or `oneOff` (true for one occasion: "finish early Tuesday" never replaces the
  standing schedule).
- `validFrom` (day), `validUntil?` (day; temporary things end by themselves), `lastSeen` (when it was last confirmed
  by data or by the person), `reviewAt?`.
- `origin`: `said` (they told it), `agreed` (they said yes to it), `learned` (computed from data, shown apart).
- `exerciseIds?` (a sore shoulder shows next to the lifts it touches), `goal?` (numbers and pace, old Aven's `GoalPlan`),
  `was?` (earlier wordings, newest first).

**`coachItem`**: one thing on the Coach's ladder. `stage`: `observation` → `recommendation` → `proposal` → `accepted`
or `undone` (plus `dismissed` and `expired`, so silence and "no" are learned from too). `text`, `basedOn` (the facts
behind it), `expiresAt` (a stale notice is never shown), `actionId?` (the change it made when accepted, so Undo is the
real Undo).

### Settings
**`settings`** (one record, `id: settings`): `language` (`en`, `da`), `dayStartHour` (0–6), `weekStart` (0 Sunday, 1
Monday), display units (`kg`/`lb`, `km`/`mi`, `cm`/`in`), `restDefaultSec`, food targets (`kcal?`, `protein?`, …,
`waterMl`). Keys for AI services are never in data, backups or logs: they live in their own storage key (`a2.keys`, later).

## 4. Every change goes through one action log
- An **action** is one thing the person (or the Coach, or an import) did: `{ id, at, tz, source, type, label, changes,
  undoes?, undoneBy?, group? }`. `label` is plain words ("Ticked set 2 of Bench press: 8 × 80 kg").
- `changes` lists every record it touched, with only the fields that changed: `before` and `after`. A new record has no
  `before`; a deleted one gets `deleted` in `after`.
- **The records and the action are written in the same database transaction.** Either both land or neither does, so the
  history can never disagree with the data. A multi-step change (a plan edit, a restore, an import) is one action, so it
  lands whole or not at all.
- **Exactly once.** The action id is made at the moment of the tap. Writing the same action id twice is a no-op, whether
  the second comes from a reload, a retry or another tab (IndexedDB runs write transactions one at a time across tabs).
  A double tap makes two actions, but a tick sets fields to a value instead of adding to them, so the second tick changes
  nothing and records nothing. Creating a record whose id already exists is refused.
- **Undo reverses only its own change.** Undo checks that every field it would put back still holds the action's
  `after` value. If anything newer changed one of them, Undo stops and lists what changed ("set 2 was edited after
  this"), instead of overwriting newer work. Undoing a creation also stops if a field was added since (a set created by
  "start workout" and then ticked). Undo is itself an action, so it can be undone too. Nothing ever restores an
  old whole-state copy over newer edits.
- **Deleting a fact invalidates what was built on it.** In the same transaction, every live record whose `basedOn`
  includes the deleted (or changed) record is marked `stale`. Undo never clears `stale`: another change may also have
  made it stale, so it stays stale until it is worked out again.
- **Saving shows its true state.** A change is shown at once as **pending** (the tap is never blocked), becomes
  **saved** only after the database confirms the transaction, and becomes **failed** (kept, with Retry) if the write
  fails, for example a full disk. "Saved" is never shown early.

## 5. Timers
- The rest timer stores `endsAt` (a clock time), not "seconds left". What the screen shows is always `endsAt − now`, so
  a reload, a locked phone or a slow frame resumes at the right number and the first frame never jumps.
- Pausing the workout pauses the rest: `pausedLeftMs` is kept, and resuming sets a new `endsAt`. −15 / +15 / Skip
  change `endsAt`.
- Workout time is `now − startedAt − pausedMs` (minus the current pause), as in old Aven.
- **No app update in the middle of a workout.** `updateAllowed()` says no while a session is `active` or `paused`, or
  while a save is pending. The service worker will ask it before switching versions (app-shell phase).

## 6. Storage
- **Database `a2.data`**, stores: `records`, `actions`, `meta` (schema version, persistence answer), `snapshots`
  (last-known-good copies).
- **Persistent storage** is asked for once there is real data (Chrome grants installed apps without a prompt).
- **Full disk**: a write that fails with a quota error leaves nothing half-written (the transaction is rolled back), the
  action shows as failed with the reason, and the person is told to export a backup.
- **Crash-safe**: everything that must land together is one transaction.
- **Isolation**: Aven 2 reads and writes only `a2…` names. Its "delete everything" removes only `a2` storage. Old Aven's
  "Delete everything" (keys starting with `aven`, its databases `aven-photos`, `aven-chat`, its watch store) and Aven
  Beta's copy (`aven…` → `beta:…`) can't touch `a2`: tests replay their exact rules. Aven 2's offline cache and service
  worker (app-shell phase) live under `/Overall-fitness-/` with cache names starting `a2-`, apart from old Aven's
  `/The-new-Claude-gym-app/`.

## 7. Schema versions, migrations and backups
- The database and every backup record their schema version. Migrations are plain functions from version n to n+1:
  no clock, no randomness, so running them twice gives the same result. Before any migration (and before a restore or an
  import) a **last-known-good copy** of everything is saved in `snapshots`.
- A database written by a newer version opens **read-only** in an older version: it never writes over data it doesn't
  understand.
- **Backup file** (`a2-backup`): `{ app: 'a2-backup', format: 1, schema, exportedAt, counts, records, actions, checksum }`.
  The checksum is SHA-256 over the content, so a damaged or cut-off file is caught before anything is touched.
- **Restore** reads the file and shows a preview first ("found 214 workouts, 1,302 foods; 12 newer than on this phone"),
  then offers **merge** (same id: the newer `updatedAt` wins, listed; something deleted on the phone stays deleted) or
  **replace** (the phone becomes the backup). Either one is a single action with Undo, after a last-known-good copy. A
  damaged file, a wrong file or a half-finished restore changes nothing.

## 8. Import from old Aven
- **Sources**: old Aven's backup file, or the one-tap copy, which reads old Aven's saved data (`aven.v1`) on the same site.
  Both only read; nothing is ever written to an `aven…` key or database.
- **Dry run first**: a report of what would come over, what is skipped and why, before anything is written.
- **What comes over**: workouts (sessions → session, slot and set records; ticked sets become `done`, the routine's targets
  become `planned`), custom exercises, routines and the plan, logged food (with its frozen numbers, estimate flag, quick
  entries), water, bodyweight, measurements, activities (wrestling and the rest), steps and health days, memory notes
  (→ memory cards, goals kept), and settings (language, day start, week start, units, rest, targets).
- **Skipped, with the reason in the report**: a workout still running in old Aven ("finish it there first"), custom foods,
  saved meals and recipes, remembered dictation choices and weight jumps (they come with the Food and Workout phases;
  importing again then adds them without duplicates), heavy-day catch-ups and target history (Coach phase), weekly
  reviews, daily notes, progress photos and the Coach chat archive (Progress and Coach phases), and demo data.
- **Never duplicates**: ids come from the old ids. A record already here is left alone; one deleted here stays deleted.
- **One action**: the whole import is one action, so one Undo takes it all back (records edited since are listed and
  left alone unless the person says otherwise).
- Old records keep their own day; their time zone is the phone's at import time (old Aven didn't store one).
