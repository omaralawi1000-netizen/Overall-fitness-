# Concepts (Checkpoint 2, step 8)

All twelve concepts from 1 Nov 2026, in words only. Set A is Claude's, written before seeing any other ideas. Set B is
another AI's, written without seeing set A; Omar gave each B concept as one line, and the longer write-ups of B1, B2, B4
and B5 are Claude's expansion of that line. The seeds at the end are ideas from Omar's earlier research, not concepts.

Every concept shares the same baseline: one tap ticks a set, thumb targets of 56 px or more, a visible press response
within 50 ms, motion you can catch mid-gesture, and logging that works offline without the AI.

## Omar's picks (1 Nov)
- **Prototype two structures: B2 Living Notebook and B5 Conversation Workspace.** Each prototype shows one visual
  explanation ("why has my bench stalled?" as an explorable chart) and "25 minutes left" as a plan change he can see and
  apply.
- **A2 Atmosphere is a look, not a structure.** It is tested through the blur test as a material option that could go on
  either one.
- Order: the blur test first, judged on his phone; concept UI after that.

## Best six (Claude's comparison, 1 Nov)
A1 Deck, A2 Atmosphere, Instrument (A3 with B1's framing), B2 Living Notebook, B5 Conversation Workspace, B4 Expedition.
Dropped: A4 Earpiece (depends on Danish speech recognition that isn't verified; always-on listening failed in old Aven),
A5 Depth (does Atmosphere's job at a higher GPU cost and is the hardest to learn), A6 Broadcast (easy to make loud),
B3 Rehearsal Room (a feature, not an organizing idea; every concept previews changes anyway), B6 Session Stage (organizes
only the workout; overlaps Deck).

---

## Set A (Claude)

### A1. Deck
**Organizing idea.** Your day is a hand of cards: the top card is the one thing to do now. That might be the next set, lunch, or a talk with the Coach. Finish it and it leaves (a set is ticked with one tap, then the card goes by itself; other cards can be flicked away), and the next card is already underneath.

**Coach.** The Coach writes the cards. Its voice is the card's headline. When it wants to change the plan, it slips a new card into the deck, and you can see it arrive. There's no orb: the Coach is the author, not an object on screen.

**Navigation.**
- Pull down on the stack and the whole day fans out like a hand of cards.
- Pinch out and the days of the week fan out (clip 25).
- To talk to the Coach, you draw its card, which is always last in the hand.

**Hierarchy.** One card fills about 70% of the screen. The fanned view is the only overview.

**Art direction.**
- Opaque matte card stock with real paper-like shadows, and no glass.
- Each card type has its own saturated colour: lifting in deep ultramarine, food in tomato red, recovery in sage, the Coach in cream ink. Each colour is judged on its own card.
- Bold condensed numbers, with a friendly grotesk for the Coach's sentences.

**Motion.** Physical card handling: flick, fan, slide in, with spring tilt and settle. The thrown card keeps your finger's speed.

**Memorable interaction.** The reshuffle. When the Coach changes the plan, the cards that are cut fly to a discard pile, new ones slide in, and the deck squares itself up. You can catch any card mid-flight.

**Clips.** 13 (swipe with a rubbery feel), 17 (one gesture to approve), 12 (cards), 25 (pinch between levels), 06 (reward on completion).

**"I have 25 minutes left."** You say it or type it, or tap the time chip on the current card. The Coach deals a new hand: two accessories go to the discard pile, and the top card becomes "Last: shoulder press 3 × 8". Nothing changes until you flick the proposal card up to accept it.

**First open, no data.** A single card that says "Hi. Let's set you up", with the Coach's first question on it. Each answer becomes a card that stacks up, and by the end you're holding your first week.

**Trade-off.** One card at a time is great in the gym, but weak for looking things up, like "what did I bench in March?". History needs its own fanned-out mode, and that mode can feel tacked on.

### A2. Atmosphere
**Organizing idea.** The background is a living sky that shows your state: recovery, energy, how the day is going. Morning after good sleep looks bright and clear. After a hard wrestling night it's heavy and slow. During a set it narrows to a focused glow. Content floats on top of it as clear, see-through panes.

**Coach.** There's no orb. The Coach is the light: when it speaks, light rises from the bottom of the sky and the words appear in it (clip 01, the light only). Hold anywhere on the sky to talk.

**Navigation.**
- Three places (Today, Train, Talk) on a single see-through bar.
- Scrolling down sinks you deeper into the sky, where history lives.

**Hierarchy.** One sentence and one number sit large in the open sky. Everything else sits in panes under it.

**Art direction.**
- Each screen gets its own sky colour, judged by whether it looks alive. It can be warm or cold, whatever is right for that moment.
- Heavy live blur on the panes, with a progressive blur at the top and bottom edges.
- Airy, light type with big numerals.

**Motion.** Slow weather: gradients drift, clouds part when something good happens, and panes slide like ice on water.

**Memorable interaction.** Press and hold anywhere: the sky brightens under your finger and the Coach listens. Let go and the answer rises with the light.

**Clips.** 01 (light handover), 11 (progressive blur), 05 (frosted depth and cascade), 16 (data you feel), 21 (colour mood per topic), 02 (depth that feels alive).

**"I have 25 minutes left."** The sky shifts toward dusk, a clear signal that time is short. The Coach's light rises with "Here's 25 minutes: bench, then shoulder press, skip the fly." You slide to accept (clip 17).

**First open, no data.** A neutral dawn. The sky "learns" you during onboarding, getting warmer and more defined with each answer you give.

**Trade-off.** It's the most beautiful and the most expensive of the six. A moving gradient under several live blurs is the hardest case for 120 fps and for banding, and a moving sky can hurt how readable the numbers are. It depends entirely on the blur test passing.

### A3. Instrument
**Organizing idea.** The app is a piece of training hardware. The current set is a set of physical controls: a big weight dial, a rep slider and a rest ring, all in the lower half under your thumb. It's like a camera or a synth.

**Coach.** A thin readout strip at the top that prints short lines, like a display on a device: "Same as last week. Go for 8." Tap it and it expands into a full conversation panel. There's no orb.

**Navigation.** A hardware-style mode switch at the bottom: a three-position rocker for Train, Eat and Talk, with a click and a haptic tick on each step.

**Hierarchy.** The controls are the hierarchy: the biggest control is the thing you'll touch next.

**Art direction.**
- Matte surfaces, either dark anodised or bright plastic, picked per mode.
- One strong signal colour per mode.
- Engraved-looking labels, monospaced numbers and fine tick marks.
- No glass anywhere except the conversation panel.

**Motion.** Mechanical: detents, inertia, and snapping to 2.5 kg steps. Everything feels weighed.

**Memorable interaction.** Spin the weight dial with your thumb. It coasts with inertia, ticks with a haptic at every 2.5 kg, and you can stop it dead with a touch. Logging a set means pressing a big physical-feeling key that sinks and clicks.

**Clips.** 14 (direct physical control), 15 (dial through time), 19 (native gestures), 06 (rewarding tap).

**"I have 25 minutes left."** Turn the session's time knob from 60 to 25. The program strip visibly compresses: exercises slide out of the strip and set counts drop. The readout says what it kept and why. Let go to accept.

**First open, no data.** The device "powers on" with a short boot sequence, then the readout asks the first question. The controls aren't drawn yet; they appear one at a time as onboarding gives them something to control.

**Trade-off.** It's superb in the gym, but food logging, reading the Coach and history have to fit a hardware metaphor that doesn't naturally hold them. It can feel gimmicky outside training.

### A4. Earpiece
**Organizing idea.** It's made for training with the phone in your hand or pocket. You talk and the Coach answers, mostly out loud. The screen shows exactly one thing, readable at arm's length.

**Coach.** Its voice. On screen it's a thin light along the edges of the display that moves when it speaks or listens. There's no orb and no glass as the idea.

**Navigation.** Almost none. There's one living screen, the current moment. Swipe up for the transcript of today. Swipe sideways for food and for history.

**Hierarchy.** One gigantic line: "80 × 8" during a set, "1:42" during rest, "Lunch: 40 g protein to go" between meals.

**Art direction.**
- Pure black or pure paper white, decided by the moment and the light (gym or daylight).
- One accent colour per moment.
- Huge, very heavy numerals with small calm captions.

**Motion.** Big type slides and swaps; the edge light breathes. Very few moving parts.

**Memorable interaction.** Say "eight at eighty". The edge light ripples once, the big line flips to "Done. Rest 2:30", and you hear one short confirmation. Logging takes zero taps.

**Clips.** 20 (care on one small element), 21 (a coach that speaks first with real numbers), 18 (a big friendly headline), 26 (asks the right things, then changes the plan).

**"I have 25 minutes left."** Say it. The Coach answers aloud in one sentence, and the transcript shows the new short plan with a big Accept button.

**First open, no data.** The onboarding is spoken: "Hi. I'm your coach. Tell me how you train." It also works with taps and typing for anyone who doesn't want to talk.

**Trade-off.** Gyms are loud and many people won't talk to their phone in public. How good the speech recognition is in Danish varies by phone and browser, and I haven't checked it on yours. Every action needs an equally good tap path, which means designing two apps.

### A5. Depth
**Organizing idea.** Time is depth. What's now is closest to you and sharp. What's later sits further back, increasingly blurred. What's done sinks below. You move through your day by pulling layers toward you.

**Coach.** It's the light behind the layers, a soft source deep in the stack, which brightens and moves forward when it speaks. A light, not an object.

**Navigation.**
- Pull down to bring the next layer forward, and push up to send it back.
- Pinch out to see the whole stack from the side, the day as a set of panes (clips 25 and 05).

**Hierarchy.** It's literally z-order: the front pane gets 100% of the attention.

**Art direction.**
- Clear glass panes in a dark, deep space.
- Each layer is tinted by what it holds, so lifting, food and recovery each have a colour.
- Real progressive blur that increases with depth.
- Thin, precise type.

**Motion.** Parallax and focus pulls. Layers move at different speeds, and focus racks between them like a camera lens. Everything follows the finger and can be caught.

**Memorable interaction.** The focus pull. Drag down slowly and you watch the next exercise come into focus as the current one slides past you and fades. Let go halfway and it springs back.

**Clips.** 11 (progressive blur), 05 (frosted depth), 02 (real depth), 25 (pinch levels), 10 (a morph you can follow).

**"I have 25 minutes left."** The far layers, the exercises that won't fit, drift off into the blur and dissolve. The stack shortens visibly, and the Coach's light says which ones stayed.

**First open, no data.** One pane in an empty deep space. Each onboarding answer adds a pane behind it, and you see your plan gain depth.

**Trade-off.** It's the heaviest on the phone: several stacked live blurs are the worst case for frame rate. Depth as time is beautiful, but takes a moment to learn. A friend may not get it in 5 seconds.

### A6. Broadcast
**Organizing idea.** Your session is a live sports broadcast. There's a scoreboard, a game clock and lower-third captions, and the Coach is the commentator. It fits the gym and especially wrestling.

**Coach.** The Coach is a voice in lower-thirds: short caption bars slide in with commentary ("Best bench in two months"). A full conversation opens as the "studio", a calm desk view. There's no orb and no glass as the idea.

**Navigation.** Three channels: Live (the session), Studio (the Coach), Replays (history). You switch with a big channel strip at the bottom.

**Hierarchy.** The scoreboard (current lift, set, weight × reps) is the hero. The clock is always visible during a session.

**Art direction.**
- Bold broadcast graphics with solid colour bars.
- Your chosen "team colours" as the palette, so friends can pick their own.
- Condensed, heavy, kinetic type. Opaque, crisp and high contrast.

**Motion.** Broadcast stingers: wipes, bars sliding in and out, numbers flipping like a scoreboard. Each one is fast and then still.

**Memorable interaction.** The replay. A new record triggers a short broadcast-style replay: the bar graphic sweeps in, the old best and new best flip side by side, and the commentator line appears. Tap to skip; it's never forced.

**Clips.** 24 (data drawing in), 18 (a playful, personal headline), 06 (reward on a tap), 21 (real numbers, a coach that speaks first), 03 (one object travelling between screens: the scoreboard shrinks into the corner bug).

**"I have 25 minutes left."** "Clock management": a game clock appears at 25:00 and the Coach's caption reads "Two-minute drill: bench, shoulder press, done." Tap Accept on the caption.

**First open, no data.** A "pre-game show": the Coach interviews you like a draft-day profile, and your profile card builds itself as you answer.

**Trade-off.** It's the most fun, and the easiest to make too loud. Daily use needs real restraint (most days quiet, stingers only for real moments). It can also feel macho, which needs testing on friends who aren't athletes.

---

## Set B (another AI)

### B1. The Instrument
*As given:* a precise instrument for the activity underway; the workout reshapes as time changes.

Claude's merged version, with A3's controls and B1's framing:

**Organizing idea.** The screen becomes the right precise instrument for whatever you're doing right now:
- a set: a weight dial, a rep key and a rest ring
- a meal: a scale with portions
- wrestling: a round timer
- a question: a readout

When time changes, the instrument reshapes the workout.

**Coach.** A thin readout strip at the top that prints short lines. Tap it to open the full conversation. There's no orb.

**Navigation.** None to learn. The instrument follows what's happening: the session, the clock, what you just said. A small switch at the bottom lets you pick another instrument by hand.

**Hierarchy.** The biggest control is the thing you'll touch next.

**Art direction.**
- Matte surfaces, with the colour picked per instrument.
- One signal colour each.
- Fine tick marks and monospaced numbers.
- Glass only on the readout when it opens.

**Motion.** Mechanical: detents, inertia and snaps, with a haptic tick at each 2.5 kg. A spinning dial can be stopped dead with a touch.

**Memorable interaction.** Spin the weight dial. It coasts and ticks, and it stops under your thumb.

**Clips.** 14, 15, 19, 06.

**"I have 25 minutes left."** Turn the session's time ring to 25. The program strip compresses as you turn, and the readout says what stayed. Let go to accept.

**First open, no data.** The readout asks the first question. Each instrument appears the first time there's something for it to measure.

**Trade-off.** Ten instruments must feel like one family. Each new activity type means designing a new instrument.

### B2. The Living Notebook
*As given:* rough notes become editable structured entries in place.

**Organizing idea.** The app is a notebook. You write or say rough notes like "8 at 80, 8, 6", "skyr 200 g + 2 eggs" or "tired, bad sleep". Each one turns in place into a structured entry you can edit: the set rows, the food with its macros, a sleep note. Today is one page.

**Coach.** It writes in the margin: short notes beside your entries, like "2.5 up on last week" or "protein 90 g behind", with an action where one helps. It never takes over the page. There's no orb.

**Navigation.** One page per day: swipe for other days, pinch out to see the week as pages. Search is the way into history.

**Hierarchy.** What you wrote last is at the bottom by your thumb, and the writing line is always ready. Older entries above it get quieter.

**Art direction.**
- Paper-like but not fake paper: a warm or cool ground per page, picked by what looks alive that day.
- Ink-coloured text, with each entry type in its own ink colour.
- A handwritten-feeling face for raw notes, and a crisp face once they're structured.

**Motion.** The transformation is the hero: the words you typed slide apart and settle into rows and numbers, and you can follow every word into its field (clips 03, 10). Edits ripple through the totals.

**Memorable interaction.** Type "80 for 8, 8 and 6" and watch it become three set rows in place, with last time's numbers ghosted beside them. Tap one number and fix it.

**Clips.** 03, 10, 20, 08, 24.

**"I have 25 minutes left."** Write it on the page. The Coach answers in the margin with a crossed-through plan: the cut exercises get struck through, and an Accept sits beside it.

**First open, no data.** A blank page with one line from the Coach: "Tell me about your week. Write it like a note." Your answers become the first entries and memory cards.

**Trade-off.** It's the fastest for logging, and mid-workout it's the weakest at showing what comes next, because a page shows the past better than the plan. The workout needs a clear "next set" line that doesn't break the notebook idea.

### B3. The Rehearsal Room
*As given:* try proposed changes side by side before applying.

Not expanded (dropped from the best six: it reads as a feature every concept needs, not an organizing idea).

### B4. The Expedition
*As given:* a training season as a journey of milestones.

**Organizing idea.** Your training season is a journey: a route from where you are to your goal, like "compete next spring" or "90 kg by 31 January". Milestones sit along the way. Each day is one step on the route, and today is where you're standing.

**Coach.** The guide. It speaks at milestones and when you drift off pace ("You're a week ahead"), and it re-routes when life changes. There's no orb.

**Navigation.** Zoom levels: today's step, the week's stretch, the whole route (pinch, clip 25). Train, food and talk are reached from today's step.

**Hierarchy.** Today's step and the distance to the next milestone are the biggest things on screen.

**Art direction.**
- Topographic: a route line across a contour landscape, with the colour shifting along the season.
- Matte and drawn, not photographic.
- Confident, slightly editorial type.

**Motion.** Travel: the camera glides along the route, milestones rise as you reach them, and the line draws itself in (clips 15, 24).

**Memorable interaction.** Pinch out from today and the camera pulls back along the whole route to the goal. You see how far you've come and how far is left, and you can stop the camera anywhere with a touch.

**Clips.** 15, 25, 24, 07, 21.

**"I have 25 minutes left."** It's a short stage: the guide shortens today's step to the lifts that matter most for the goal, and shows that the route still holds.

**First open, no data.** "Where do you want to get to?" The route draws itself as you answer, from today to your goal.

**Trade-off.** It's the best for goals and motivation, and the furthest from the set you're doing right now. Logging sits one level down, and people without a clear goal need a gentle default route.


### B5. The Conversation Workspace
*As given:* requests become editable plans, not chat answers.

**Organizing idea.** Every request becomes an editable object, not a chat answer. "Plan my week around Thursday's late shift" returns the week itself, as a board you can drag, change and apply. The app is a workspace of these living plans: today, this workout, this week, the cut.

**Coach.** It's the author of the plans. It shows up as edits that appear on the objects, with its reason attached. A conversation line at the bottom is how you ask. There's no orb.

**Navigation.** A short shelf of open plans (Today, Workout, Week, Goal), each a full screen. Swipe between them. A new request either opens a plan or changes one.

**Hierarchy.** The plan you're in fills the screen. The Coach's latest change is highlighted until you accept or undo it.

**Art direction.**
- A calm, light workspace, with each plan type in its own clear colour.
- Opaque, crisp surfaces; glass only on the request line.
- Precise, legible type built for numbers and tables.

**Motion.** Changes are visible: rows slide to their new place, cut items fold away, new ones grow in, and Undo plays it all backwards (clips 04, 08, 22).

**Memorable interaction.** Ask "move pull to Friday". The week board rearranges itself in front of you, Thursday folds into Friday, and one Undo chip sits where it happened.

**Clips.** 26, 17, 22, 04, 08, 21.

**"I have 25 minutes left."** The workout plan rebuilds in place: cut exercises fold away, sets drop, and a 25:00 marker appears. One Accept, one Undo.

**First open, no data.** The empty workspace holds one object: "Your first week". It fills in as the Coach asks its questions.

**Trade-off.** It's the most useful for planning, and the least emotional. It can feel like a productivity tool, and the signature moments (a record, finishing a workout) need extra care to feel special.

### B6. The Session Stage
*As given:* the workout as a focused performance; each set builds a session composition.

Not expanded (dropped from the best six: it organizes only the workout, not food or the Coach).

---

## Idea seeds (from Omar's earlier research; seeds, not concepts)
Glass Seed · Signal · The Thread · Living Headline · Edge Presence · Constellation · Coach Tray · Path · Faceted Mark ·
Quiet Conversation · Living Canvas · Invisible Coach · Training Lens · Ambient Companion · Timeline Intelligence ·
Dynamic Instrument · Coach Workspace · Spatial Depth · Motion Identity · Living Training Map · Kinetic Workout ·
Living Decision Coach · Training Reality Map · Personal Progress Universe · Seamless Companion
