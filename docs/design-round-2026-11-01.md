# Final design round: the decision (Part 1, 1 Nov 2026)

Omar's ask (1 Nov, night): triage the design-bar rules, define the Coach ladder, map states and navigation, name two directions that differ in structure, check what a PWA can really do. Part 2 (clickable shells) waits for his go. Where this file and `research/design-bar-2026-11-01.md` disagree, this file wins.

## 1. The 16 rules
**Keep** = real usability need. **Soften** = hypothesis Part 2 tests. **Drop** = arbitrary.

1. **Tabs** — keep labelled, always visible, live strip above. **Drop "exactly 4"**: the count follows the state map; A and B use different counts.
2. **Signature on every screen** — soften. The crop test is a test, not a law.
3. **Colour = state only** — soften the state field (Heat's rest was the one move everyone credited). **Drop "and nothing else"**: it's a global colour ban, which Omar rejected. New firm rule: state colour always comes with a word or shape.
4. **Own layout per state** — keep the need (no morning zeros); one skeleton, different hero.
5. **No equal cards** — **drop**. The MyFitnessPal revolt was about big cards pushing out info, not equal sizes. Keep: one hero per screen, no card in a card, detail opens over where you were.
6. **No leftover strikes or hollow digits** — keep (a stranger read them as broken).
7. **Top 40% = the day as a shape, locked** — **drop "40%" and "locked"**. Soften the day shape (A tests it). Keep: one big number with unit and meaning; each fact once.
8. **Coach one line, can be empty or off** — keep.
9. **Every category one tap from Today** — keep (usual food in 1–3 taps, Start in thumb reach). Drop reorderable cards (fewer knobs).
10. **Focus view** — keep the content (done small, current big, next faint, target + delta, last time, one fraction). **Drop the "3×" and "3 numbers" ratios**; the test is: readable at arm's length.
11. **Full list as a sheet** — keep.
12. **One filled button, labelled with its result** — keep; it always names exactly what it logs. Drop "bottom third"; test thumb reach instead.
13. **Rest full-screen, readable at 2 m** — keep. Soften plates per side (barbell only).
14. **Proposals during rest** — keep timing, scope, reason, Undo, history, "never a started set". **Drop "the log tap also accepts"** (§2).
15. **Two-step finish** — keep.
16. **One food input** — keep. Soften "clock time instead of meals" (A tests it, B keeps meals).

**Orb:** no preference. It appears in A only, redesigned, with a job you can read without learning. If a stranger can't say what it does in 5 seconds, it becomes a plain labelled button.

## 2. The Coach ladder
Each rung looks different, so you always know whether anything changed.
1. **Observation** — a short italic line ("Bench up three weeks running"). No button. Nothing changes.
2. **Recommendation** — a line with a target mark and "Why?" ("Try 82.5 next week"). Nothing changes; "Plan it" makes it a proposal.
3. **Proposed change** — a draft: old value struck, new value in the Coach's colour (A: a dashed card; B: a dashed glass card with the number drawn hollow), scope ("Bench, sets 3–4, today"), one reason, an accept control (**Slide to use 82.5** in A, an outlined **Use 82.5 kg** in B) and **Keep 80** as text. Never filled, never shifts what's under your thumb.
4. **Accepted change** — the new value solid, no strike, a "Coach" tag with **Undo** until its scope ends, and a history entry.
5. **Completed action** — the set is logged at 82.5: your real data. History reads "80 → 82.5, done 82.5 × 8". Undo now only restores the plan for sets not yet done; a logged set changes only by editing it.

**Accepting is deliberate.** Accept never sits where Log is. Log always names its value: with a proposal pending, "Log 80 × 8" logs 80 and the proposal waits. Accept ignores taps for 0.5 s after it appears. A uses a slide to accept, B a tap. Every proposal (accepted, kept, undone, expired) is listed in the Coach's history; the workout list sheet shows today's.

## 3. Navigation
**States:**
- **Morning** — today's plan, one target, protein/kcal to go. No zeros.
- **Planned training** — when, what, target to beat, Start in reach.
- **Live / resting** — full-screen focus view, then a full-screen countdown with the next set and any proposal. Other tabs show a live strip.
- **Done** — reward screen, then Today's done state.
- **Rest day** — food and recovery lead.
- **Wrestling day** — its own activity: leave-by time, drill / sparring / live rounds, round timer, effort, mat minutes, notes. Own symbol on the week and in Progress. Never logged as sets.
- **Food** — from anywhere in 1–3 taps, totals in view.
- **Progress** — lifts, weight, food trend, mat time, records.
- **Coach** — conversation, editable memory, change history.
- **Empty** — the Coach asks about your week (big tap answers without a key); every empty list says what will appear.
- **Error** — on the item, plain words, Retry. Logs save on the phone first, never lost.
- **Offline** — a small chip. Everything works except the AI and food search.
- **Missing permission** — always a fallback: no mic → keyboard; no notifications → rest runs in-app; no camera → type the barcode; no wake lock → a tip; no key → computed notes.

**Structure:** the workout is a full-screen mode above the tabs (you do it, you don't browse it). Profile and Settings sit behind your initial (rare, so no tab). The Coach's home opens from the ask door, because Omar wants the Coach inside every part, not as a place you visit. Tabs differ per direction.

## 4. Two directions
Shared: the focus view, full-screen rest, the ladder, the food tray, blur method A.

**A. "Day line": time first, one door for everything.**
- Tabs **Today · Plan · Progress** plus a centre **Log** key. Today = the day; Plan = training week, wrestling and food targets; Progress = what changed.
- One door: Log takes a set, food, water, weight, wrestling or a question, by chip, typing or voice. The parser logs what it can; the Coach answers the rest. Food has no tab: it lands on the day at its clock time.
- Today: the day drawn as a band (sessions, wrestling, meals, a now-mark) with one big number ("26 min to leave"). Coach notes are pinned to points on the band.
- The orb, newly designed, is the Log key: labelled "Log", it shows the Coach's note count and opens into the input while listening. Its shape never changes.
- Feels like a journal or a flight tracker for your day. Risk: "where's food?"

**B. "Rooms": place first, colour tells the state.**
- Tabs **Today · Train · Food · Progress**, plus a round **Ask** button beside the bar, not one of the tabs. Today = what now; Train = gym and wrestling (Gym | Mat), because both are training; Food = logging and targets, the most frequent job; Progress = what changed.
- Identity: one huge poster number per screen, and a full-screen state field (training, rest, wrestling, rest day) with the state named in words. No orb.
- Today: hero number, next thing with Start, food left, week row. Each block opens its room. The Coach line sits at the top of each room, notes sit on rows.
- Feels like a normal app done extremely well. Risk: ordinary, which is what the control catches.

**Control:** a neutral shell in the Hevy + MyFitnessPal pattern (tabs, list workout, meal buckets), built fresh, not copied. All three get the crop test and the 5-second test side by side.

## 5. Platform truth (checked 1 Nov 2026)
- **Live Activities / Android 16 Live Updates:** web apps can't post either; only a native Android wrapper could. The in-app rest screen does the whole job, and nothing fakes a lock screen.
- **Notifications:** Android: shown only while the page is alive. Scheduled local notifications never shipped, and Chrome slows, then pauses, background pages. So a rest-end alert on a locked phone needs a push server or the wrapper. iPhone: push only for Home Screen apps (16.4+), with a server; no background timers.
- **Screen awake (wake lock):** Android Chrome yes. iPhone Home Screen apps were broken from 16.4 to 18.3, reported fixed in 18.4, unconfirmed on iOS 26: test on an iPhone.
- **Vibration:** Android yes, iPhone no (only an unofficial trick). A buzz is a bonus, never the only signal.
- **Voice:** Android Chrome speech-to-text works online; in iPhone Home Screen apps it often fails. Typing must be as easy as talking; with a key, audio goes to the AI.
- **Health Connect / Apple Health:** not reachable from the web. Android wrapper only.
- **Barcode:** built in on Android Chrome; iPhone needs a WebAssembly scanner.
- **Storage:** IndexedDB + persistent storage; iPhone keeps Home Screen app data. Keep the backup file.

Sources: [Chrome Wake Lock](https://developer.chrome.com/articles/wake-lock/) · [WebKit 254545](https://bugs.webkit.org/show_bug.cgi?id=254545) · [Progressier wake lock](https://progressier.com/pwa-capabilities/screen-wake-lock) · [Notification Triggers](https://developer.chrome.com/docs/web-platform/notification-triggers) · [Chrome background tabs](https://developer.chrome.com/blog/background_tabs) · [Pushpad iOS push](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications) · [WebKit 225298 speech](https://bugs.webkit.org/show_bug.cgi?id=225298) · [web-haptics support](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support) · tech scan §E.

## Part 2 (after Omar's go)
A, B and the control as clickable shells at `/round/` (no storage): navigation, Today (training and rest day), the workout working and resting with a proposal, Food add. In motion: a tick into rest, rest into the next set, and a proposal arriving, accepted, then undone. Held fixes: italic only for short Coach lines, a clear signal for tappable numbers, readable record markers at night. One judge round on Sonnet, then Omar picks on his phone.
