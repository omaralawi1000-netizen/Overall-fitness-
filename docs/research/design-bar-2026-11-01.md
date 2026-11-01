# The design bar: what the best apps do, and where the three looks fall short (1 Nov 2026)

Omar's request (1 Nov, evening, after trying Ink, Ink rich and Heat at /looks/ on his phone): "They look like those. Research what the absolute best apps in the world do … every screen, every layout, workout screen, today … just the layout, not the design. I want you to know what my bar is. And look at my old app." Then: "have them discuss" (the researchers debate before the answer is merged).

Update (1 Nov, night): the rules were triaged in `docs/design-round-2026-11-01.md`, which wins where they disagree (for example, rule 14's "the log tap also accepts" is dropped).

This file is the one place for the result. Nothing was built. Omar picks the next step.

## The short answer

The three looks fall short of the bar on two levels at once:

1. **They are a screen, not an app.** No tab bar, no food, no week, no finish screen, no way to ask the Coach from anywhere, no rest-day or morning Today. All nine seats agreed on this from the first round.
2. **They have no signature.** All three share one stock skeleton: date, a sentence, two buttons, rows, a black pill bar at the bottom. Three different paint jobs on that skeleton all drew "they look like those". Adding tabs and food to it would give a complete but ordinary app (Hevy plus MyFitnessPal). The best-designed apps own one form that carries data and recurs on every screen: Tide Guide's wave, Flighty's numerals, Duolingo's path, Airbnb's category symbols. Seven of nine seats changed their minds to this in round 2: identity has to be designed into the skeleton from the start, not painted on later.

Final layout scores (average of nine seats, out of 10): **Heat 5.2, Ink 4.7, Ink rich 3.8.** No seat gave any look more than 6.

The good parts are real and should survive: Ink's set stack (done sets small, current set huge, next set faint), Ink's in-place change (old value struck, new value next to it), and Heat's whole-screen colour change for rest.

## The bar (16 rules, each testable on a screenshot)

All nine seats voted to ratify these, with amendments merged in. "Evidence" names the app or source the rule comes from.

### The whole app
1. **4 labelled tabs with crafted symbols, always visible.** The tab bar never shrinks or hides on scroll. A live-workout strip sits above it on every other tab. (Apple brought tabs back to Photos in iOS 26 after a backlash; collapsing tab bars were 9to5Mac's "biggest complaint" about iOS 26; old Aven's live pill.)
2. **A signature that carries data, on every screen.** Crop test: a random third of any screen, *including crops without the dock*, is recognisably Aven. So the signature must live in the hero, not only in the dock. (Tide Guide, Flighty, Duolingo, Airbnb.)
3. **The background colour means the state and nothing else.** One field colour per state (training, resting, wrestling day, rest day). Chrome stays neutral. No tint used for decoration. (Nike Run Club's full-screen pause colour; Heat's teal rest was the one identity move every seat credited; Ink rich's decorative pastel scored lowest.)
4. **Each state gets its own layout:** morning before anything is logged, planned, live, resting, done, rest day. A morning Today shows the planned day and targets, never rows of zeros. (No top app documents a morning state; old Aven opened on zeros.)
5. **No equal-card grids, no cards inside cards.** Detail opens over where you were, as a sheet or an expanding card. (MyFitnessPal's April 2026 big-card "Today" caused a user revolt; Heat's Protein and Sleep tiles and Ink rich's glass slabs are this mistake.)
6. **No strikethrough or hollow digits outside a pending proposal.** After a change is applied the screen reads clean, with Undo. (The stranger read Ink's applied Today, with six strikes left, as broken, and Heat's hollow 82.5 as an empty field.)

### Today
7. **The top 40% is the day drawn as a shape, carrying one big number for the moment.** Session, meals and wrestling sit on one strip with a "now" mark. The number changes with the state and always shows its unit and meaning: "26 min to leave" when wrestling sets a deadline, the start time or sets left on a normal training day, "84 g protein left" on a rest day. Protein and kcal left stay visible small. Each fact appears once on Today. (WHOOP, Oura and Google Health lead with fixed numbers; Tiimo, App of the Year 2025, draws the day as colour blocks; Flighty's countdown hero; nobody puts training, food and a combat sport on one Today.)
8. **The Coach is one line under the shape.** It grows into a card with buttons only when it changes the next hour ("Leave by 16:50. Trim Push to 22 min?"). It may be empty on quiet days. Today must pass the 5-second test with the line hidden, and the line can be turned off. (Google Health had to add "No Coach insights"; WHOOP users are angry its Coach can't be disabled; Flighty expands only on a change.)
9. **Every category is one tap from Today.** A usual food logs in 1 to 3 taps; start or resume the workout sits above the fold in thumb reach. The top 40% is locked; cards below it can be reordered or hidden. (MacroFactor favourites; old Aven's Start sat at 80% of the screen height; WHOOP users ask to move Plan up.)

### The live workout
10. **Focus view.** Done sets small above, the current set huge, next sets faint, one "Then: Incline 30 × 10" line. The current set is at least 3× the next text size, with no more than 3 numbers readable at arm's length. It is prefilled with the target to beat and its delta ("55 × 8, +2.5 kg"), with last time beside it. One labelled fraction per screen (the looks show "1 of 3" next to "Set 3 of 4", and "1/3" while the list has 5 exercises). (Liftin', MacroFactor Workouts; Nike Run Club and Flighty's size ratio; old Aven's "Up next" deltas.)
11. **The full list is a sheet one tap from the header** ("Bench · 1 of 5"): swap, skip, reorder, superset. In a superset the tick moves to the paired exercise. (Hevy, Fitbod, Boostcamp's swap that keeps the targets; a focus-only screen breaks on supersets and busy machines.)
12. **One filled control, fixed at the bottom, labelled with its result** ("Log 82.5 × 8", "Skip rest"), in the same place in every state, spanning the bottom third. One tap ticks the set and starts rest. Nothing above it triggers an action with one stray tap. Changing weight or reps is one tap on the digits, which opens a gym-sized stepper or keypad, never the phone keyboard. (Hevy, Strong's own keypad, Fitbod users calling Log Set too small, the watchOS 26 small-button backlash.)
13. **Resting is a full-screen change readable from 2 metres.** The countdown is the hero, then the next set and the plates to load per side, with −15 / +15 / Skip. (Garmin's strength rest screen; old Aven's rest bar that becomes the next-set bar; nobody shows plates during rest.)
14. **Coach proposals arrive during rest, because the bar is loaded then.** The new value takes the hero in the accent colour labelled "Coach suggests", with the old value small and struck, one reason line and the scope ("bench, sets 3–4, today"). "Keep 80" is a text link. The bottom button names the new value, so the one tap that logs the set also accepts the change. It never changes a set already started. After logging, the strike is gone, Undo stays until the next set, and every applied change is listed in a visible history. No second filled button. (Tonal's "Next Move" with an X; Runna states the scope and never changes "without your input"; no fitness app has Undo after an AI change.)
15. **The finish takes two steps:** save (warn about unticked sets), then a reward screen with records, "Next time" targets and planned vs done. (Strong, Hevy, MacroFactor; old Aven's summary was its best screen.)

### Food and the Coach everywhere
16. **One food input.** Typed or dictated text that matches history ("skyr 200 g") logs at once; only unknown foods go to the AI, which returns separate editable items in a tray. One confirm that names the kcal. Kcal and protein left stay visible while logging. Food lands at its clock time on the day strip, not in breakfast and lunch buckets, and the quick chips change with the hour. Danish portion chips first. Going over target is shown plainly, never in alarm red. Undo, never "are you sure". (MacroFactor's Plate, timeline and banner; Cronometer's swipe-delete with undo; Cal AI's one-blob result is the weak case; Welling and MacroFactor avoid red.)

Plus, for every tab: the Coach has three layers, each with its own size. A line slot of 2 lines or fewer (may be empty), notes attached to the row they concern, and one ask door for voice and text in the same place on every screen. It never opens over data on its own. (Fitbit's Ask Coach on every page; WHOOP's "Analyzing…" over workout stats drives cancellations.) Outside the app is honest for a PWA: the screen stays awake during a workout and rest-end vibrates and notifies. A web app can't post an iOS Live Activity or an Android 16 Live Update, so the in-app rest screen does the whole job.

## Where each look falls short

**Heat (5.2).** The best rest screen (teal field, 1:28 as hero, "Next 50×7", Undo) and the Today line that read fastest. Falls short on: Today ends in two equal Protein and Sleep tiles (rule 5); the big button says "DONE" during rest, so it's unclear what it ends (rule 12); "1/3" in the header vs "Set 4/4" on the button vs 5 exercises in the list (rule 10); the hollow 82.5 reads as an empty field, the grey Apply looks disabled, and the row of "80×8" chips can't be read in 5 seconds (rules 6 and 14); Today's hero is a sentence, not a number or shape (rule 7).

**Ink (4.7).** The best working-set layout (done small, current huge, next faint) and the most original move in all nine shots: the in-place diff. Falls short on: Today is a plain list behind a two-button question, with no number, no shape, no food and no week (rule 7); six strikethroughs stay after Apply and read as broken (rule 6); the blue "Apply 82.5 kg" is the brightest thing on screen next to Done, so there are two primary actions mid-set (rules 12 and 14); "0/3 2" can't be parsed; "1 of 3" vs "1 of 5" vs "Set 3 of 4" (rule 10); no visible swap, skip or full list (rule 11).

**Ink rich (3.8).** Has the only Today with protein, sleep and the week together. Falls short on: everything is boxed into equal glass slabs, with a card inside a card on the workout (rule 5); rest shrinks to "Rest 1:29" inside the Done bar, so working and resting look the same (rule 13); the date, time and "3 of 3" vanish into the yellow background (rule 3); protein is a dead end with no add path (rule 9).

**All three:** no tabs, no food, no ask door, no finish, no morning or rest-day state, and no signature form. The look switcher also covers the workout header in one shot.

## Old Aven: what to keep and what it teaches

The researcher ran old Aven with demo data and took 43 phone-size screenshots (saved with the raw reports, see below).

Keep: the live pill above the tab bar; the Today card that changes with the day's state; "Up next" targets with "+2.5 kg" deltas; the rest bar that becomes the next-set bar (−15 / +15 / Skip); tap last time to copy it; the "New best" chip on the set just ticked; the summary screen (record count, "Strongest Lat Pulldown yet", "Next time", planned vs done); one-tap food chips with Danish portions; the add button that names its kcal; Health chapters that grow into chart pages; the Coach sentence with an inline data pill; wrestling as a full activity; the orb as a fixed object.

Lessons: old Aven had the right content and the wrong hierarchy. Two heroes competed on Today (a huge kcal number and the workout card), Start sat at 80% of the screen height, kcal showed in three places, and the workout was a table where every row looked the same, so "now" was hard to find. The rest timer was about 34 px. Coach and Settings had no real home. Yet the 5-second stranger said old Aven (orb, glow, one big number) impressed more than any of the three looks. That is the evidence that a signature object plus scale matters, not just tidy structure.

## Left open for Omar

**Is the signature the orb or a non-orb form?** Seven seats: the orb, because it is the only form that has already made a stranger ask "what's that?", it can carry the Coach's state (has a note, listening, silent) and it is the ask door on every screen. Two seats (critic, best-designed apps): a non-orb form in the hero (the day shape, poster numerals, the state colour field), because a dock object misses two of three crops. Agreed by all: the orb gets no blank-page privilege. If it stays, its job must be readable without learning it (a small "1 note" chip next to it), and inside the workout the rest colour field carries the identity, not the orb. Both directions should be built and tested.

## Recommended next step

Not "pick one of three". One new round of the whole app shell, built to the 16 rules: tabs, Today in two states (training day and rest day), the workout working and resting with a Coach proposal, and Food add. Two identity directions that differ in their hero form, not just the dock icon: (A) the orb plus day strip, (B) numerals plus state field, no orb. Judge both with the crop test and the 5-second test, side by side with a Hevy plus MyFitnessPal screenshot as the "ordinary" control. Without that control the test repeats the mistake that produced three looks Omar called ordinary.

The five fixes held for the winner of the three looks (PROGRESS, session 4) are mostly absorbed: italic only for short Coach lines, the tappable-number signal and the record marker contrast still apply to whichever direction wins.

## How this was made

- Seven researchers searched the web on 1 Nov 2026 for the current versions (2025–26) of: lifting apps (Hevy, Strong, Liftin', Gravl, Fitbod, Boostcamp, Ladder, MacroFactor Workouts, Apple Workout), health Today screens (WHOOP, Oura, Bevel, Apple Health and Fitness, Gentler Streak, Athlytic, Garmin, Google Health/Fitbit with Gemini, Strava), food loggers (MacroFactor, Cronometer, Cal AI, Lose It, Yazio, Lifesum, Welling), the world's best-designed non-fitness apps (Apple Design Award and App Store Award winners 2024–26, Flighty, Things, Structured, Copilot, Revolut, Airbnb, Not Boring, Linear, Duolingo, iOS 26/27 apps), AI coach placement (WHOOP Coach, Oura Advisor, Fitbit Gemini, Runna, Strava, MacroFactor, ChatGPT and Claude voice, Siri), glanceable live screens (Apple Workout and Live Activities, Android 16 Live Updates, Nike Run Club, Peloton, Zwift, Garmin, Tonal, Flighty, Uber), and old Aven (run locally, read-only).
- Then a three-round council, using Roast Room's debate method (opening positions, debate on named disagreements with a forced unanimity check, then a ratification vote) with the seven researchers plus a harsh design critic and a 5-second stranger as the nine seats. Roast Room's own advisors (Bezos, Hormozi, Buffett…) were not used: they are business advisors, not layout experts.
- How sure: most apps don't publish their layouts in words, and the researchers could not watch videos. Claims from company docs, release notes and screenshot captions are solid. Exact on-screen placement for some apps (Flighty, Structured, Revolut, Airbnb homes; Strong's column names; Liftin's newest set display; Cal AI, Lose It and Yazio first screens) is marked unverified in the raw reports. App makers' own speed numbers (MacroFactor) are self-reported. None of this changes the 16 rules, which each rest on more than one app.
- Raw reports, every round's cards, and the old-Aven screenshots: project files `aven2/design-bar-2026-11-01/` (not in this public repo; old-Aven screenshots use demo data).
