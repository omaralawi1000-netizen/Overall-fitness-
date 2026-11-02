# The engine: spec, review and decisions

Omar's spec (2 Nov 2026) replaces every earlier engine message. It is kept here in short form with the fixes from the
review below. Where this file and his words differ, his latest words win.

## What the engine is
The foundation that doesn't depend on the look: logic, data and tests, plus one bare debug page at `/engine/`.
TypeScript. No screens or styling. Logic that is clean and tested is ported from old Aven with its tests (BRIEF.md,
"Port the logic, rebuild the UI"); the blank page is for design only.

- **Step 0** (Opus): `docs/engine/old-logic-map.md`, every old `src/lib` module marked keep / port now / port later / drop.
- **E1a** (Opus): data model, storage, action log and Undo, timers, migrations, backup and restore, import from old Aven.
- **E1b** (Sonnet main, Opus advisor): the instant logging parser and `docs/parser-examples.md`.
- **Debug page** `/engine/`: type a phrase and see what it understood (E1b), log a few sets, export and restore a backup,
  import an old Aven backup and read the report. Uses only `a2` storage.
- **Quality**: a test for every rule, property-based tests (parser, units, deduplication, apply→undo), ported old tests as
  regressions, made-up data only, no network calls, `npm run verify` and a code review before a phase is called done.
- **For later phases** (written into INVENTORY/LESSONS now, not built): speech vocabulary hints and audio cleaning, one
  shared conversation for orb and Coach, heavy-day noticing to the Coach phase, screens behind the live workout never
  redraw per tick, Danish strings load separately.

The full requirement list for each part lives in `DATA-MODEL.md` (E1a) and `PROGRESS.md` (the checklist per phase).

## Review (2 Nov, before any code)

**Score: 7/10.** The spec gets the hard things right: data safety first, missing is never zero, exactly-once, Undo that
owns its change, no silent restores, an import that can't hurt the old app, and a parser that refuses to guess.

**Biggest weakness: E1a is three projects in one, and Omar can't judge any of it on his phone.** A storage engine with an
action log and conflict-aware Undo, a backup/restore/migration system, and an importer are each a session's work. The
only thing he can see is a debug page, so "done" rests on tests he can't read. Fix: E1a is split into three parts, each
ending in a short phone check, and `PROGRESS.md` keeps a table of every rule with the test that proves it and what is
still untested.

**Contradictions, and how they are resolved**
1. *"Wrestling sessions as their own activity"* vs INVENTORY and the "for anyone" decision (27 Oct: nothing about one
   person is built in). → A **sport session** is its own activity type (not a workout), with rounds, intensity and minutes;
   wrestling is the first sport, not a special case. Old Aven's wrestling logs import into it.
2. *"Every value carries units"* taken literally means a unit on every number, which invites mismatches. → Each field has
   one **fixed canonical unit** in the schema (kg, g, ml, kcal, s, m, cm); when someone typed another unit (lb, dl), the
   original is kept beside it as `entered: { value, unit }`. Time, source and schema version are on every record.
3. *Old setCommand reads a bare "no" as Undo*, but the spec wants "80… no, 60" to mean 60. → E1b: "no" inside a phrase
   is a self-correction; only a whole phrase that is just "undo / fortryd" undoes. ("no" alone asks.)
4. *"Save in the background, never block a tap"* and *"never show saved while pending"* are both right but need a rule
   together. → Every write has three visible states: **pending** (shown at once, the tap is never blocked), **saved**
   (only after the database confirms), **failed** (kept on screen with Retry; never silently dropped).

**Gaps, now decided**
5. *Source of truth.* Not event sourcing. Records are the truth; every change writes the records **and** one action
   (before/after per changed field) in the same database transaction, so the log and the data can never disagree.
6. *Undo conflicts.* Undo applies only if every field it touches still holds the action's "after" value. If something
   newer changed it, Undo stops and says what changed instead of overwriting.
7. *Restore "merge".* Same id on both sides: the newer `updatedAt` wins and the report lists every such case. A record
   deleted on the phone stays deleted unless the person chooses "replace". Replace keeps a last-known-good copy first.
8. *Re-import never duplicates.* Imported records get ids made from the old ids (`old:<id>`), so a second import finds them.
9. *BRIEF.md also asks for the one-tap "copy my Aven data in"* (read old Aven's saved data on the same site). It is the
   same importer reading `aven.v1` read-only instead of a file, so E1a builds both.
10. *What the old backup holds but E1 doesn't take yet*: progress photos, the Coach chat archive, watch detail. They are
    listed in the import report as "skipped, why", never dropped silently. Memory notes, goals, workouts, routines, food,
    water, weight, measurements, activities, steps, health days and settings come over.
11. *Day boundary changes.* A record keeps the day it was logged into. Changing "day starts at" later never moves old
    records (old Aven did the same). Logging into yesterday sets the day explicitly.
12. *"Never apply an update mid-workout"* needs a service worker, which E1 doesn't have. → E1 builds and tests the rule
    (`updateAllowed(state)`); wiring it to the worker comes with the app shell.
13. *"Deleting a fact invalidates summaries and reminders built on it"*: there are none in E1. → Every derived thing will
    record which facts it used; E1 builds that link and its invalidation, tested with a stand-in summary.
14. *Deploy coupling.* Adding `package.json` switches on the build-and-test steps already written into `pages.yml`. No
    workflow change is needed (the engine builds into `dist/engine/`, `site/` is copied on top as before), but from then on
    a failing engine test stops the design pages from deploying too. Rule: only merge to main when everything is green.
15. *Old Aven's "Delete everything"* removes localStorage keys starting with `aven` and its own databases (`aven-photos`,
    `aven-chat`, its watch store); Aven Beta's copy reads only `aven…` keys and writes only `beta:` keys. `a2` is safe from
    both, and tests prove it. The reverse must hold too: Aven 2 never clears anything outside `a2`.
16. *Two open tabs.* IndexedDB transactions plus a unique key per tap (the action id) make a double tap, a reload or a
    second tab write a set once. "Lost network" doesn't apply to E1: everything is on the phone.

**Not possible here**
- `/advisor` is a terminal command; this project thread can't call it. I said so and went on, checking my own approach
  against the spec and the old code instead.
- `/verify` doesn't exist as a command here; `npm run verify` (typecheck, tests, build) is used instead.
