# INVENTORY: every feature in old Aven, and what Aven 2 does with it

Walked from every file in old Aven's `src/screens`, `src/lib`, `src/state`, `src/ui`, `src/data` and `android/`
(v0.1.184, 27 Oct 2026). One line per feature: what it does, then the call and why.

- **keep**: Aven 2 has the *feature* (what it does for the person). How it looks and moves is designed new: old Aven's
  design is inspiration only (Omar, 27 Oct). Any old design worth keeping goes to Omar as an improved proposal first.
- **merge**: it lives on, folded into something else (named).
- **cut**: gone on purpose. Needs Omar's yes at Checkpoint 1 (listed again at the end).
- **later**: wanted, but not in the first phases. PLAN.md places it.

Two changes run through everything (Omar, 27 Oct): Aven 2 is for **anyone**, not just Omar, so nothing about one person
is built in (wrestling, "never lighter", his thresholds become things the Coach learns); and the **Coach is the
product**, so many buttons and settings become "just tell the Coach".

---

## 1. Today

| Feature | What it does | Call | Why |
|---|---|---|---|
| Header date + name | Long date and your name | keep | Orientation; name comes from onboarding |
| Coach button (sparkle) | Opens the Coach | merge → the orb, always present | One way in to the Coach from anywhere |
| Settings button (gear) | Opens Settings | keep | |
| Coach pin | Top card: things the Coach noticed | merge → the Coach's morning line on Today | Same job, one voice; it speaks only when it matters |
| Day ring (food ledger) | Today's kcal/macros; tap → Food | keep | The one number most people check |
| Quick add row (Log / Scan / Photo) | Fast food logging under the ring | merge → one "log" sheet (say, type, photo, barcode) | Omar wants all four from one place |
| Water pill | One tap adds water, Undo | keep | Cheap, used daily |
| Recent foods chips | Re-log a recent food in one tap | keep | Biggest logging time-saver |
| Workout hero card (5 states) | Running / planned / done / first session / rest day | keep | The heart of Today; rebuilt |
| Estimated workout length | ~45 s per set + rest | keep | Small, useful |
| Muscle tags | Main muscles of a routine | keep | |
| Training-day reminder bar + notification | "Time to train" after a set time | merge → Coach speaks first | A coach decides when to nudge; no fixed alarm |
| Missed workouts + Reschedule | Up to 2 missed, move them | keep | Honest, actionable |
| Week in review card | Midday Sunday → Monday summary | merge → Sunday review from the Coach | One review, from the Coach |
| Reorderable, switchable cards | Drag order, toggle each | cut | Fewer knobs; Aven 2 chooses a good order. The Coach can hide a card if asked |
| Up next card | Next workout and lifts to beat | keep | Motivating, data-true |
| Week strip | 7 days: done, planned, wrestling, missed | keep | Generalised: any sport, not only wrestling |
| Week fill animation | Today's circle fills after a workout | keep | A small signature beat |
| Muscles this week | Hard sets per muscle vs a 10-set aim | merge → Progress | Not a daily glance |
| Recent records | Newest PRs | merge → Progress, plus the record moment | Records get their own moment instead |
| Weight trend card | Latest weight + trend + log | keep | Core for anyone on a cut/bulk |
| Customize Today chip | Opens Today settings | cut | Goes with the card toggles |
| Demo data chip | Remove demo data | later | Demo mode only if friends need it to try the app |

## 2. Live workout

| Feature | What it does | Call | Why |
|---|---|---|---|
| Full-page workout window, swipe down to minimise | Rises like a music player, kept alive | keep | Proven shape; rebuilt cleanly (old one is the most fragile code) |
| Minimise chevron, Escape closes | | keep | |
| Status bar follows the window | | keep | Feels native |
| Tap title to rename | | keep | |
| Live clock, pause/resume | | keep | |
| Tally line (sets · volume, rolling) | | keep | |
| Rest shown in header while typing | | keep | |
| List / Focus toggle | Two views of one workout | keep, decided in Checkpoint 2 | Directions may make one view the default |
| Finish button (muted → accent → ready glow) | | keep | |
| Progress hairline | | keep | |
| Living light / breath | Window light breathes, warms over the hour | later | Decoration; only if the chosen direction wants it |
| Staged list build | | merge → general performance rule | Implementation detail |
| Empty session state | | keep | |
| Exercise card (name, muscles, menu, note, hints) | | keep | |
| Superset rail | | keep | |
| Progression reason line | "+2.5 kg · set 1 hit 12" | keep | The app explains itself |
| Coach memory flag on an exercise | "Left shoulder hurts" + Swap | keep | Memory showing up where it matters |
| Card settle sheen | Light passes over a finished exercise | keep, redesigned | Part of "ticking a set" |
| Add set / warm-up | | keep | |
| Exercise menu (replace, superset, move, note, rest, remove) | | keep | |
| Finish / Discard confirm | | keep | |
| Discard with Undo | | keep | |
| Keyboard handling | | keep | |
| Set row (prev, fields by type, RPE/RIR, check) | | keep | |
| Placeholders from plan/last time | Tick with empty fields uses them | keep | Fast for sweaty hands |
| Prev cell tap to copy | | keep | |
| Set number → warm-up/working/delete | | keep | |
| Check button: tap only; untick cancels rest | | keep | Firm rule: tapping is the only way to tick |
| Enter on reps ticks | | keep | |
| Current-set outline glides | | keep, redesigned | Part of "ticking a set" |
| Auto-reveal next set | | keep | |
| Workout bar: next / rest / go / done / empty | | keep | The rest timer's home |
| Rest −15 / +15 / Skip | | keep | |
| Last 3 s swell + buzz, chime, "go" state | | keep, redesigned | Signature moment: rest timer |
| Orb in the bar (dictate sets) | | keep | |
| One tick path (tap, voice, Coach, watch) | | keep | Clean rule, port the logic |
| Auto-resume on tick | | keep | |
| Rest cue anywhere in the app | | keep | |
| Lock-screen rest notification (+30 / Skip) | | keep | |
| Rest-over alert with Done ✓ (watch / lock screen) | | later (Android phase) | Needs the Android wrapper |
| Ask once for notifications | | keep | |
| Rest debug traces shown in Settings | | cut | Debug lines don't belong in a user's Settings; keep them in a dev log |
| Stale workout prompt | "Still training?" after 6 h | keep | |
| Briefing card at workout start | Health note, "Wrestling tomorrow" | merge → Coach line at workout start | Same idea, one voice |
| Lift hints ("heaviest yet", "Stuck at X · Use it") | | keep | The Coach in the workout |
| Focus view: one exercise per page, dots, auto-advance | | keep, decided in Checkpoint 2 | |
| List ↔ Focus card morph | | keep if Focus stays | |
| Moving SVG figures / exercise clips | 6 figures, 2 clips | later | Big art job, not core; revisit after the core loop |
| Summary: medal, odometers, headline, records, next time, planned vs done, note, save as routine | | keep, redesigned | Signature moment: finishing a workout |
| Post-workout check-in (energy, soreness, sleep) | | merge → Coach asks when it helps | Watch already knows sleep; a fixed form every time is noise |
| Session detail: edit sets, delete, Repeat, Save as routine | | keep | |

## 3. Train / library

| Feature | What it does | Call | Why |
|---|---|---|---|
| Plan / Library / History tabs | | keep | |
| Week grid, tap a day → schedule | | keep | |
| Missed workouts list | | keep | |
| Routine cards (duplicate, schedule, play) | | keep | |
| Coach one-off routines hidden from lists | | keep | |
| Wrestling tile | Mat minutes this week | merge → "your sport" tile | Generalised for anyone's sport |
| Cardio & recovery tile | | keep | |
| Exercise search (fuzzy, both languages, muscle chips) | | keep | |
| Create custom exercise | | keep | |
| History (workouts + activities, delete with Undo) | | keep | |
| Routine editor (steppers, drag to reorder, superset, delete with Undo) | | keep | |
| Schedule: fixed weekdays or rotation, one-off days, sport days | | keep | Sport days generalised beyond wrestling |
| Reschedule missed (today / tomorrow / pick / skip) | | keep | |
| Activity log (wrestling rounds + intensity, cardio) | | keep | Any sport can have rounds and intensity |
| Exercise picker (filters, multi-select, substitutes) | | keep | |
| Exercise detail (plan card, stats, steps, e1RM chart, swap for, weight jump) | | keep | |
| Muscle map | | keep | |
| Starter plan (from onboarding) | Routines from goal, experience, gear, days | merge → onboarding: the Coach builds the first plan | Same output, by conversation |

## 4. Food

| Feature | What it does | Call | Why |
|---|---|---|---|
| Day navigation, date picker, "Today" chip | | keep | |
| Day / meal menus (copy, save as meal, notes, clear) | | keep | |
| Day ledger dial (4 rings, kcal left, catch-up line, burned) | | keep, redesigned | |
| Empty day → meal cards | | keep | |
| Meal cards + entry rows, swipe to delete with Undo | | keep | Swipe-delete is fine; only set-ticking is tap-only |
| Water tile + water sheet | | keep | |
| Week strip (7 calorie bars) | | keep | |
| Food search (local, recents, favourites, my foods, + quick add) | | keep | |
| Online lookup (Open Food Facts; USDA via server) | | keep (OFF only) | GitHub Pages has no server, so USDA never ran live; OFF direct + Danish list |
| No-match → Create | | keep | |
| Dictation into search | | merge → one log sheet with the mic | |
| Tool row (Scan, Photo, Quick add, New food, Recipes, Saved meals) | | keep, fewer visible | Behind one "more" |
| Food detail (portion, variants raw/cooked, units, meal, day, nutrition table) | | keep | |
| Smart default quantity | | keep | |
| Looked-up foods saved offline | | keep | |
| Barcode scanner (native or ZXing, manual number) | | keep | Works with no key |
| Photo of a plate → AI estimate, scan animation | | keep | Needs a key; always shown as an estimate |
| Camera sheet (in-app camera) | | keep | |
| Quick add (kcal/macros, blank = unknown) | | keep | |
| Personal food / correct a food | | keep | |
| Saved meals | | keep | |
| Recipes (servings, prepared weight) | | keep | |
| Coach recipes with real-food macros + shopping list | | keep | |
| 601 built-in foods (EN + DA), 3,660 Danish packaged products offline | | keep | Danish foods first; ODbL attribution for OFF data |
| Dictation choices remembered ("skyr" → this skyr) | | keep | |
| Heavy-day watch + catch-up trims + "a little over" toast | | keep, as Coach behaviour | Generic code, but it becomes the Coach's judgement per person, not a fixed feature |
| Targets history (judge a day against its own target) | | keep | Honest numbers |

## 5. Coach and voice

| Feature | What it does | Call | Why |
|---|---|---|---|
| Coach chat (full sheet, kept on the phone) | | keep, rebuilt | The product |
| Typing bar (grows, Enter sends, Stop) | | keep | |
| Queue while busy | | keep | |
| Orb as microphone, auto-stop on quiet | | keep | Signature moment: the orb listening |
| Send a photo | | keep | |
| Long-press anything → "Ask the Coach about this" | | keep | Strong, unique |
| Suggested prompts on an empty chat | | keep | Built from the person's data |
| No-key warning | | keep, softer | No-key mode explains what works without a key |
| Thinking status ("Looking at…", "Still thinking…") | | keep | Honest about waiting |
| Answer writes in word by word | | keep, redesigned | Signature moment: the reply arriving |
| "Which AI answered" note | | keep | Honesty |
| Web search with source chips | | keep | |
| Read aloud (Gemini TTS, word highlight, 30 voices) | | keep, one default voice | Fewer knobs; voice picker one tap deeper |
| Action cards with Undo, Undo all, previews, Apply | | keep | Core principle: it acts, always with Undo |
| "Undo" by voice | | keep | |
| Errors with Try again | | keep | |
| New chat | | keep | |
| First-open disclaimer | | keep | |
| Long chats load in batches | | keep | |
| Orb screen (full-screen voice) | | keep | |
| Speech: Groq Whisper, then browser speech, then typing | | keep | |
| Type instead / Speak instead | | keep | |
| Said words morph into a bubble | | keep, redesigned | |
| Quick-log auto-close with a flying icon | | keep | |
| Continue in Coach | | keep | One conversation everywhere |
| Coach memory page (grouped, reword, history, until, linked exercises, goal progress, add your own) | | keep, rebuilt | Memory is visible and editable |
| Learned from you (habits from undo/moves/swaps) | | keep | |
| Conversation history search + delete | | keep | |
| Goals with numbers (weight, lift, other), pace, check-ins | | keep | Living-coach step 2, ported and generalised |
| Weekly review sheet (tiles, focus, verdict, priorities) | | merge → Sunday review from the Coach | One review |
| Today notes / nudges (rules, no AI) | | merge → Coach speaks first | Same brain decides |
| AI insights once a day | | merge → Coach speaks first | |
| Plan a day ("chest and triceps tomorrow") | | keep | |
| Photo of a program → routine | | keep | |
| 56 Coach actions | | keep, as one tested action layer | Rewrite `agent.ts`; keep every action |
| Router (quick vs main model) | | keep | Saves friends' AI money |
| Spend tracking + monthly limit | | keep | Friends pay for their own key |
| Trouble log ("How the Coach is doing") | | keep, in About | |
| Safety rules (no starving, skipping meals, water cuts, purging; minors) | | keep, word for word | Firm rule |
| "Never tell them to train lighter" (global) | | merge → a per-person preference | It was Omar's rule; for anyone else it's learned |
| Wrestling built into the Coach | | merge → "your sports", learned in onboarding | Works for any sport |
| Background coaching (living-coach steps 3–6) | | later (Android phase) | Needs the Android wrapper; the PWA alone can't wake itself |

## 6. Progress and health

| Feature | What it does | Call | Why |
|---|---|---|---|
| Health tab coach line | Sleep vs usual + top note | merge → Coach line | One voice |
| Goal card with pace | | keep | |
| 24-hour ribbon (sleep, heart, steps, moves) | | keep | Strong, original view |
| Chapters: Recovery / Activity / Body rows grow into pages | | keep | |
| Sleep page (hypnogram, score, 14 nights) | | keep | |
| Heart page (resting, HRV, overnight vitals, VO2 max) | | keep | |
| Steps page | | keep | |
| This week page (sports, route map) | | keep | |
| Weight page (body composition) | | keep | |
| Training page (old Progress charts) | | keep | |
| Range picker (4 w / 12 w / 6 m / all) | | keep | |
| Charts: consistency, sport minutes, volume, bodyweight, calories | | keep | |
| Recent records, exercise trends | | keep | |
| Weekly reviews list | | keep | |
| Sleep score and Ready score | | keep | Computed against your own normal |
| Bodyweight sheet | | keep | |
| Measurements sheet | | keep | |
| Progress photos (on the phone only) | | keep | |
| "Connect your watch" row | | keep | |
| Health pages Slide / Grow setting | | cut | One motion, chosen in DESIGN.md |

## 7. Settings and data

| Feature | What it does | Call | Why |
|---|---|---|---|
| Profile: name, birth year, height, sex, goal, goal weight | | keep, filled by onboarding | The Coach asks; Settings shows and edits |
| Targets: kcal, P/C/F (linked), suggest macros, fibre, water | | keep | |
| Heavy-day notices On / Quiet / Off | | merge → tell the Coach | A Coach preference, not a switch |
| Clear nutrition targets | | keep | |
| Training: default rest, effort RPE/RIR, weight jump, workout view, sound, haptics, lock-screen rest | | keep | |
| Food: meals (rename, add, remove), water quick amounts, online lookup | | keep | |
| Units & locale: language, kg/lb, km/mi, cm/in, week start, day start hour | | keep | |
| Appearance: 8 palettes | | cut → one look, plus light/dark | Fewer knobs, done perfectly (brief) |
| Appearance: 9 backgrounds incl. your photo | | cut | Same |
| Appearance: background glow Full / Soft / Off | | cut | Same; reduced motion covers the need |
| Appearance: theme System / Light / Dark | | keep | |
| Appearance: motion System / Full / Reduced | | keep | Accessibility |
| Appearance: high refresh rate toggle | | cut | Always on; 120 fps is the target |
| Appearance: frame-rate readout | | merge → hidden developer menu | Not for users |
| Today: cards order and toggles, Coach pin toggle | | cut | Goes with Today's fixed order |
| Voice & AI: Groq, Gemini, OpenAI keys (save and test) | | keep | Friends bring their own key |
| Voice & AI: brain choice, model pin, quick model, thinking levels | | merge → one "AI" page with a good default; details behind "Advanced" | Fewer knobs |
| Voice & AI: spending this month + limit | | keep | |
| Voice & AI: transcription accurate/fast, language, mic phone/earbuds | | keep | Mic choice fixes earbud call mode |
| Voice & AI: Gemini understands dictation | | cut | Always on when a key exists |
| Voice & AI: read-aloud voice | | keep, behind Advanced | |
| Voice & AI: what leaves your phone | | keep | Privacy honesty |
| Coach memory | | keep | See §5 |
| Watch (Android): connect, sync, disconnect, recent workouts | | later (Android phase) | |
| Reminders: training-day reminder | | merge → Coach speaks first | |
| Data: storage error banner | | keep | |
| Data: export backup (with or without photos) | | keep | First build phase (Omar, 27 Oct): save a file to the phone |
| Data: Google Drive backup | | later | Works, but needs each friend's own Google client ID; file backup first |
| Data: import backup with preview and Undo | | keep | First build phase, with the export |
| Data: import from old Aven (file + one tap) | | new | Brief: one-way, read-only |
| Data: demo data | | later | |
| Data: delete everything | | keep | Fixed: resets every AI preference, and only Aven 2's own keys |
| Privacy text | | keep | |
| About: version, credits | | keep | |
| About: Beta box (copy my real data in) | | keep | Beta channel in Checkpoint 2 |
| About: record stutters | | merge → developer menu | |
| About: how the Coach is doing | | keep | |
| Redo setup | | keep | Re-runs the onboarding talk |

## 8. Onboarding (new for everyone)

| Feature | What it does | Call | Why |
|---|---|---|---|
| Old 6-step form (name, goal, experience, gear, days, units, language, kcal, protein, starter plan, demo) | | merge → a short talk with the Coach | Omar, 27 Oct: "a new person tells the Coach about their life", Danish or English |
| Works with no key | | new | The talk falls back to a few big tap-answers when there's no AI key |
| AI key step | | new | A friend sets up alone: paste a key (with a short how-to) or skip |
| First plan | | new | The Coach proposes the first week from what it heard; Apply / change |

## 9. App shell, PWA and Android

| Feature | What it does | Call | Why |
|---|---|---|---|
| Four tabs + dock with orb | | keep, decided in Checkpoint 2 | Directions may change navigation |
| Tab switch animation | | keep, redesigned | |
| Colour field per tab, backgrounds by time | | cut | Goes with palettes/backgrounds |
| Status bar tint | | keep | |
| Page sinks behind sheets, calm mode | | keep | |
| Screen wake lock during a workout | | keep | |
| Resume bar above the dock | | keep | |
| Home-screen shortcuts (food, voice, photo, sport, workout) | | keep | |
| Launch animation | | keep, redesigned | Signature moment: opening the app |
| Update banner, silent update in first 10 s | | keep | |
| Overlay stack, Back closes the top sheet, catch a closing sheet | | keep, rebuilt | |
| Toasts with Undo | | keep | |
| Haptics vocabulary | | keep | |
| Lazy screens, pre-built workout window | | keep (as performance work) | |
| Broken screen guard | | keep | |
| Danish first paint | | keep | |
| Persistent storage request | | keep | |
| Glow/dither machinery (canvas glows, grain, frost copies, dock shadow) | | cut unless proven | Brief: only if the new design needs it. Design avoids banding by construction |
| Beta build isolation | | keep, rebuilt | Checkpoint 2, step 13 |
| Android TWA wrapper (Health Connect read/write, native rest countdown, Done ✓ on watch, background job) | | keep, right after the core loop (Omar, 27 Oct) | Reuse with new URLs and package id; about a day of work plus CI |
| Health Connect sync via `#hc=` address | | keep, with the wrapper | Validation code ports as is |
| Write weight + food totals to Health Connect | | keep, with the wrapper | |

---

## Cuts and merges (Omar said yes to 1–6 on 27 Oct; 7 changed by him)
1. **Looks**: 8 palettes, 9 backgrounds, glow strength, per-tab colours, surface/look options → one look with light and dark.
2. **Today customising**: card order and on/off toggles → one fixed, well-chosen Today.
3. **Fixed reminders and forms**: training reminder, post-workout check-in form, heavy-day switch → the Coach decides when to speak or ask, and you tell it if you want more or less.
4. **Separate review and note surfaces**: Coach pin, Today notes, AI insights, Health coach line, weekly review card → one Coach voice (morning line, workout-start line, Sunday review).
5. **Wrestling and "never lighter" built in** → learned per person (your sports, your training style).
6. **Debug things in Settings** (rest traces, stutter recorder, FPS meter) → a hidden developer menu.
7. **Later, not first**: Google Drive backup, exercise figures and clips, demo data, the workout's breathing light.
   Changed by Omar (27 Oct): the manual file backup (save to the phone, restore from it) ships in the first build phase,
   and the watch and Health Connect (the Android wrapper) come right after the core loop, not at the end.
