# Motion library (2 Nov 2026)

Omar's ask: find the most exceptional animations in the world for Aven and actually watch them. Six Sonnet helpers looked at about 450 clips across 60fps.design, Ripplix, Dribbble, motion.dev, motionvault.dev, Rive, NumberFlow, Codrops, screensdesign.com and Omar's own 26 clips (the repo's "inspiration" release) plus the 10 clips in `aven2/motion-evidence/`. They kept 66 and watched each one frame by frame (timestamped slow-motion sheets, and half-speed copies). The final pick (top 3 per job) was judged on Opus.

**This is evidence, not decisions.** Only the ones Omar says he loves go into `keepers.md`.

- Watch them all on the phone: https://claude.ai/artifact/5qeq9tDy2qe2fmJsyWVNHg (♥ saves to the page's store, collection `loves`; read it with ArtifactData list).
- Clips, frames and slow sheets (shared folder, not in git; copyright stays with the makers): `aven2/motion-library/<source>/<id>/`, each source with `candidates.json` and `blocked.md`. The helpers' brief and tools are in `aven2/motion-library/_brief.md`.
- Design stills (33): `aven2/design-inspiration-2026-11-02/` with `notes.md`.
- 120 Hz verdicts are guesses from the technique, not measurements on the phone.

## Ticking a set (…and the next set becoming active)
_Gap:_ Nobody showed a great 'next set becomes active'. The closest is Strong's one-beat change (in More).

### 1. Not Boring Habits · `60fps-not-boring-hold-to-tick`
- Link: https://60fps.design/shots/not-boring-habits-long-press-mark-habit-interaction · source: 60fps.design
- Verdict: The best tick with a body: a dot swells into a lit pearl under your thumb and settles into one check. Take the swell and the settle, drop the colour burst at 2.3 s. For sets it should be one tap, so borrow only the swell, not the hold.
- What moves: 0.8-1.2 s a dark circle holds the label 'LIFT WEIGHTS'; at 1.25 s the label fades and a tiny white dot appears in the centre with sparse tick marks flicking outward; over 1.33-2.0 s the dot grows into a glossy grey sphere with tick marks orbiting; at 2.25 s a black check appears inside the sphere; at 2.33-2.58 s a loud full-colour burst of white, orange and blue shapes flashes across the screen for about 250 ms;
- Direction A: A set tick as press-and-hold ring; the next set activates after the settle.
- Direction B: Same on the Train room, one big set orb.
- Old Aven's light: The grey orb on black matches the dotted orb; skip the colour burst.
- Android 120 Hz: compositor-friendly if limited to scale/opacity; skip the burst

### 2. Reading-app concept (release clip 06) · `own-06-read-button-bloom`
- Link: (Omar’s own clip, see notes.md) · source: Omar's clips
- Verdict: Your own clip. A soft colour bloom grows from the touch point, then calms into a done state. This is the tick handing its light on, which old Aven was missing.
- What moves: Idle: the pill has a soft lilac-to-peach glow that drifts slowly side to side (3.5-6.5 s). On tap (~6.7 s) the pill text blurs out in ~250 ms into a blank blur; at 7.3 s a soft multicolour cloud blooms from the centre with a small bird/check icon spinning in, the cloud widens and warms to magenta by 8.4 s, then (~9.5 s) it collapses to a grey 'Already read' pill with a spinner then a check.
- Direction A: Tick of a set: bloom from the tick, then the row settles to its done colour.
- Direction B: Same on the Train screen set row.
- Old Aven's light: Coral tap target that blooms into a soft coloured glow, matches 'motion that grows from what you touched'.
- Android 120 Hz: needs care: animating filter: blur on a small area is OK; keep to one pill, short, and prefer pre-blurred gradient layers fading in

### 3. Motion demo · `code-motion-multi-state-badge`
- Link: https://motion.dev/examples/react-multi-state-badge · source: motion.dev examples
- Verdict: The plumbing for 'next set becomes active': the label blurs out, the new one blurs in, the pill resizes on a spring, all in under half a second.
- What moves: At 0.5 s the pill blurs its label out ('Done' fades and softens) while the icon swaps to the new glyph; at 0.6 s the new text blurs in and the pill resizes to its width with a smooth spring, finishing about 250 ms later. The check draws, the cross takes over.
- Direction A: Status chip on a band item (planned, done, missed).
- Direction B: Save, synced or error chip in any room.
- Old Aven's light: Coral accent for the active state; blur crossfade matches the glass.
- Android 120 Hz: needs care (animated blur on text; keep the radius small)

**Also kept:**
- `web-nb-hold-check` Not Boring Habits: Same Not Boring tick as the top pick, a second recording. https://screensdesign.com/apps/not-boring-habits/
- `galleries-notboring-habit-check` Not Boring Habits, via Ripplix: Same Not Boring tick as the top pick, a third recording. https://www.ripplix.com/library/loop-success-not-boring-habits-wellness-mobile-app-530417
- `code-mv-otp-verify` sucodee (via X, listed on motionvault.dev), metalforge.xyz: The row of boxes collapsing into a status pill, then into a success pill, is a complete input to progress to done in one object. https://motionvault.dev/sucodeee/status/2107420636113191248/
- `code-rive-checkbox` Rive community file 'Simple Checkbox': A satisfying tick with a physical pop and a tasteful burst. A good reference for the finish of a set. https://rive.app/marketplace/4997-10105-simple-checkbox/
- `own-strong-rest-bar` Strong workout tracker (motion-evidence strong-log): The tick, the next state (rest) and the control panel all change in one beat, and the rest is visible in the list right where you ticked. 
- `code-motion-checkbox` Motion demo (Base UI checkbox): The shortest believable tick: a path draw, nothing else. https://motion.dev/examples/react-base-checkbox

## Entering and leaving rest (A timer that owns the screen)
### 1. Apple watchOS Timers, via Ripplix · `galleries-watch-timer-preset-ring`
- Link: https://www.ripplix.com/library/opening-loop-timers-utilities-smartwatchmp4 · source: ripplix.com
- Verdict: Apple's own timer. It blurs through to one orange ring that owns the screen, with big thin numbers. That is old Aven's coral on black almost exactly, and it's B's full-screen rest.
- What moves: At 1.9 s the screen blurs and the preset grid smears to a dark glass band; at 2.0-2.1 s a large orange ring slides in from the right edge while the old row is still a blur; 2.17-2.58 s the ring finishes its slide and settles centred with the time 2:59, the + and pause buttons pop to their corners. Then the ring starts emptying with one tick per second.
- Direction A: Day line: rest as a full-screen ring that takes over the band, one number, pause + skip as two round keys.
- Direction B: Rooms: rest as a screen that is only a ring and a number.
- Old Aven's light: Orange ring on black is almost exactly old Aven's coral-on-dark. Ring could be dotted.
- Android 120 Hz: compositor-friendly (transform + opacity); the transition blur needs care but is only ~150 ms

### 2. Headspace · `web-headspace-breathing`
- Link: https://screensdesign.com/apps/headspace-meditation-sleep/ · source: screensdesign.com
- Verdict: The level is the timer. For Aven: the room's glow rises as rest runs out, so you can read it from 2 m without reading digits.
- What moves: At 1.7 s the logo fades; at 2.0 s a pale orange dome with a sleepy face rises from the bottom edge and turns solid orange within ~0.3 s. Over about 3 s it rises smoothly to nearly the top (curved top edge flattens as it rises, the smile deepens), the label Breathe in cross-fades to Breathe out at 5.0 s, and the dome falls over ~3 s back to about a third of the screen.
- Direction A: A rest screen where the day band dims and one fill shows time left.
- Direction B: A rest room whose colour and fill level are the timer, with one word.
- Old Aven's light: Strong: one big field of coloured light that takes over the screen fits the glow idea. Aven would use coral glow from the bottom, not a flat orange.
- Android 120 Hz: compositor-friendly.

### 3. Apple watchOS Blood Oxygen, via Ripplix · `galleries-watch-breath-countdown`
- Link: https://www.ripplix.com/library/loop-countdown-blood-oxygen-health-fitness-1768819683783-293 · source: ripplix.com
- Verdict: Light ribbons that pull into one line as time runs out. You feel the rest ending. Heavy as live blur, so on Android it should be a pre-drawn loop.
- What moves: 0.5-4.5 s soft red and blue light ribbons fade in and swirl behind the Start button. At 5.05 s Start and the status line vanish at once, '15 sec' appears bottom-left in big type and counts down 1 per second while the ribbons loosen, drift apart and at 8 s collapse into one thin horizontal line that vibrates and brightens (9-9.5 s).
- Direction A: Day line: a rest state where the room's glow slowly collapses toward a line as the rest ends.
- Direction B: Rooms: rest as a quiet glow with a large countdown bottom-left.
- Old Aven's light: Very close: near-black room, soft coloured light, one number. Use coral and one other hue.
- Android 120 Hz: needs care (animated blur on large layers or a canvas/shader; test GPU cost)

**Also kept:**
- `60fps-push-countdown-takeover` Push: A timer that owns the screen: each number is a full-screen event with a blur and a disc wipe, so a short wait feels intentional. https://60fps.design/shots/push-start-workout-timer-countdown-animation
- `galleries-dribbble-workout-timer-app` Dribbble shot, Stride - Fitness App Workout Interactions & Dot-Matrix UI: Dot-matrix numerals that re-light in a scramble are a rare, distinctive way to change a number, and the set to rest hand-off is a plain cross-fade, so it feels calm. https://dribbble.com/shots/27848096-Stride-Fitness-App-Workout-Interactions-Dot-Matrix-UI
- `own-ladder-rest-takeover` Ladder strength app (motion-evidence ladder-rest): Rest owns the whole screen: one enormous number, everything else quiet, entered by a decisive turn. 

## Numbers changing (Weights, timers, totals)
### 1. Maxwell Barvian, NumberFlow · `code-numberflow-shuffle`
- Link: https://number-flow.barvian.me · source: number-flow.barvian.me
- Verdict: Not just a reference: a free, ready tool (NumberFlow). Digits roll, commas and units slide out of the way, nothing jumps. Built on the browser's own animation engine, so it's cheap at 120 Hz.
- What moves: Click Shuffle at 0.5 s: every digit rolls at once through its range with edge fade; the brackets, dollar sign, comma and decimals fade and shrink away while the remaining '42' glides to the centre. About 500 ms total, no bounce.
- Direction A: Day line hero number that changes unit or size across the day.
- Direction B: Poster number per room, including a number that changes digits count.
- Old Aven's light: Thin light numerals in a glow suit it. Free to use, a tiny library.
- Android 120 Hz: compositor-friendly (WAAPI transforms; mask on a small area)

### 2. Push (push-ups) · `60fps-push-rep-digit-roll`
- Link: https://60fps.design/shots/push-workout-count-up-animation · source: 60fps.design
- Verdict: Only the digit that changed rolls, with motion blur, on a huge number. That is how B's poster number should change.
- What moves: 3.0-3.58 s a huge '45' sits still with a blurred mirror image under it; at 3.67 s the last digit slides up and swaps to 6 with motion blur over about 150-200 ms (3.67-3.83 s), the first digit '4' stays fixed; the screen background flashes a soft grey vignette at the same moment (3.75-4.1 s); the same roll repeats at 4.83 s for 47 and again for 48, 49 and 50.
- Direction A: Weights and reps on the Day line focus view; tick count when the set number changes.
- Direction B: The poster number per screen is exactly this case: big number, only changing digits roll.
- Old Aven's light: Thin light numbers rolling on black with a faint glow flash would sit well; drop the reflection or keep it very faint.
- Android 120 Hz: compositor-friendly (transform); blur needs care, use a pre-blurred duplicate

### 3. Timeline dial concept (release clip 15) · `own-15-timeline-dial`
- Link: (Omar’s own clip, see notes.md) · source: Omar's clips
- Verdict: Your own clip. A physical dial you scrub through time, with digits that blur as they roll. It's A's day line and training history in one gesture.
- What moves: 0.5-1.0 s: a curved row of ticks appears with 'Oct 15' above and one orange tick. 1.75-4.0 s a fast drag: the date label rolls (Oct 13, 11, 4, 2, Sep 30 ...) with digits blurring as they change and the tick scale tilting in perspective.
- Direction A: Scrub the day band through days; the big number rolls with blur as you go.
- Direction B: Progress screen: scrub through weeks with the big number rolling.
- Old Aven's light: Thin light numbers on black with a single orange mark is exactly the old-Aven palette.
- Android 120 Hz: needs care: the perspective strip and per-digit blur are heavy as DOM; a simplified flat tick strip (transform) with a rolling number is cheap

**Also kept:**
- `code-motion-number-trend` Motion (motion.dev) AnimateNumber demo: The roll is quick and soft-edged with no overshoot, so a changing weight or total reads instantly and never looks like a gimmick. Width never jumps. https://motion.dev/examples/react-number-trend
- `code-motion-number-counter` Motion AnimateNumber demo: The smallest honest version of a changing number: tiny travel, no bounce, instantly repeatable. It is exactly a reps or weight stepper. https://motion.dev/examples/react-number-counter
- `code-motion-number-price-switcher` Motion AnimateNumber demo: Only the digits that change move. Unchanged digits and units stay put, which keeps a total feeling stable. https://motion.dev/examples/react-number-price-switcher
- `own-16-water-tilt` Health app concept built in native iOS (release clip 16): The number and a physical thing (water height) move together; tilt makes it feel like a real object in the phone. 
- `own-23-download-pill` Liquid-glass download concept (release clip 23): A counting number inside a state-changing glass pill where the shape resizes to fit; nothing jumps. 
- `60fps-family-keypad-digits` Family: Entry feels alive: every new digit lands with a tiny scale settle and the amount re-centres smoothly instead of jumping. https://60fps.design/shots/family-number-input-commas-shift-place-interaction
- `galleries-dribbble-digit-roller` Dribbble shot, Number Counter Animation - Motion Graphics: One quick, crisp step per change with a held beat between; the optical fringe makes the numeral feel like it is behind real glass. https://dribbble.com/shots/27672877-Number-Counter-Animation-Motion-Graphics

## A Coach proposal (Arriving, accepted, dismissed, undone)
_Gap:_ No clip showed a great dismiss or undo. The stack fanning into a list (in More) is the best model for several proposals.

### 1. Proposal-approval concept (release clip 17) · `own-17-slide-to-approve`
- Link: (Omar’s own clip, see notes.md) · source: Omar's clips
- Verdict: Your own clip, and A's accept almost exactly: a coral fill follows your thumb, the label says what happened, then the card files itself into Today.
- What moves: At 9.4 s the black knob lights up after a check completes ('All clear'). 10.5 s: a drag starts, a coral fill follows the knob from the left edge; the knob picks up a fingerprint-like ring. 11.5 s it reaches the right end, the label flips to 'Approved' with a white check in the knob and the status line reads 'Northwind Studio has been notified' (swap in ~200 ms).
- Direction A: Exactly the 'Coach proposals accepted with a slide' idea in the Day line.
- Direction B: Fits less (B accepts with a tap), but a tap could fire the same fill.
- Old Aven's light: Coral fill is the single coral thing to tap.
- Android 120 Hz: compositor-friendly if the fill is clip-path or scaleX

### 2. Motion demo (Family style) · `code-motion-family-dialog`
- Link: https://motion.dev/examples/react-family-dialog · source: motion.dev examples
- Verdict: B's tap accept: the confirm grows out of the button you touched, and the main button never moves under your thumb. In Aven it must never sit where Log is.
- What moves: Tapping Receive at 0.15 s: the green pill itself grows upward into a dialog card (Confirm, text, Cancel and Receive buttons), the primary button keeping its place and colour. About 350 ms with one soft overshoot. (Closing was not in the preview.)
- Direction A: Accepting a Coach proposal on the Day line: the item grows into its confirm.
- Direction B: Tap on an item to grow into its detail and confirm.
- Old Aven's light: Exactly the old Aven principle of motion that grows from what you touched.
- Android 120 Hz: compositor-friendly

### 3. Alma · `60fps-alma-hold-to-commit`
- Link: https://60fps.design/shots/alma-hold-to-commit-button-fill-interaction · source: 60fps.design
- Verdict: The 'accepted' moment: the world blurs away and one calm check disc arrives. Commitment without confetti.
- What moves: at 3.2-3.6 s the person holds the 'Hold to commit' button and a warm pink/yellow glow starts rising from under it; 3.8-4.5 s the whole screen fades and blurs progressively while the colour wash grows (button stays sharp); 4.5-5.6 s it holds blurred in warm colours; at 5.7 s a dark green check disc appears from a tiny size and grows over ~200 ms with a small settle (5.7-5.9 s);
- Direction A: Accept a Coach proposal with a hold or slide: the slide could build the same warm wash behind the card.
- Direction B: Accepting with a tap could still end with the blur-melt and check disc, shorter.
- Old Aven's light: Different palette (light, cream) but the principle works on near-black: dim and blur the room, let one coloured glow fill it, drop a single check. Fits very well.
- Android 120 Hz: needs care (animated backdrop blur; use cross-fade to a blurred copy)

**Also kept:**
- `own-22-glass-tip-morph` Liquid-glass buttons concept (release clip 22): Choices appear out of the control you touched; no sheet, no new screen, label and icon change inside the same pill. Same pattern later turns Reply into 'Reply all reaches 17 people' with a confirmation chip. 
- `web-tiimo-slide-unlock` Tiimo: The physical drag is the confirmation, and what the drag unlocks visibly comes into focus. The headline swap overlaps instead of cutting. https://screensdesign.com/apps/tiimo-ai-plan-focus-to-do/
- `code-motion-notifications-stack` Motion demo: A stack that fans into a list is the natural way to show several Coach proposals without a screen change, and it grows from what you touched. https://motion.dev/examples/react-notifications-stack
- `own-21-money-coach-flow` Finance coach concept (release clip 21): Each topic owns the screen colour; accepting is a clear two-step (card, confirm) and the home immediately shows the next item. 
- `60fps-go-club-ai-plan-arrives` Go Club: A dotted ring as the waiting state and then the proposal arrives as cards that rise as one sequence with a call-to-action following half a second later: arrival, then the question. https://60fps.design/shots/go-club-ai-plan-creation-dots-animation
- `code-motion-hold-to-confirm` Motion demo: Gives a deliberate yes without a second dialog; progress is the animation itself. Perfect for risky confirms. https://motion.dev/examples/react-hold-to-confirm
- `own-13-swipe-actions` motion.dev swipe-actions example (release clip 13): Gestures with a physical, rubbery feel; the revealed buttons are part of the row, not a separate layer. https://motion.dev

## The Coach listening, thinking, answering
### 1. Google Gemini · `60fps-gemini-voice-aurora`
- Link: https://60fps.design/shots/google-gemini-voice-picker-interaction · source: 60fps.design
- Verdict: Listening. A spark falls like a drop and becomes a glowing band at the bottom that breathes. The best 'dark room lit by one glow' found anywhere.
- What moves: at 0.3-0.6 s the four-point Gemini sparkle sits small in the middle of a near-black screen and slowly pinches smaller; at 0.73 s it flares into a soft white blob, 0.8-0.93 s the blob falls down the screen like a drop; at 1.0 s it lands at the bottom as a faint smudge and over ~300 ms (1.07-1.27 s) spreads sideways into a blurred blue/violet glowing band with a small Stop button above the home bar;
- Direction A: A listening state for the Coach that needs no orb shape change: a band of light at the bottom, matched to the Log key.
- Direction B: The Ask button could release this band from its own position when pressed; the glow grows from what you touched.
- Old Aven's light: Near perfect match: near-black room, one soft coloured glow, nothing else. Tint the band coral/warm instead of blue/violet.
- Android 120 Hz: needs care (large blurred area; bake the blur into a gradient image and animate transform/opacity only)

### 2. AI money-app concept (release clip 01) · `own-01-orb-sunrise-flood`
- Link: (Omar’s own clip, see notes.md) · source: Omar's clips
- Verdict: Your own clip, for answering: the orb's light becomes the room the answer sits in. It's the 'light with a source' old Aven lacked.
- What moves: From 4.4 s a dome of violet/white light sits at the bottom edge of the dark screen. At ~4.8 s it swells upward in about 250 ms and the whole screen turns to soft blue light (a blur-like wash). By 5.3 s the glow has settled into a lit background with a small sparkle shape in the middle; at 6.1 s the controls fade in at the bottom and at 7 s the greeting types in. Total handover ~1.5 s, no hard edge anywhere.
- Direction A: Coach key (centre orb) could bloom to a screen-wide glow, then the day band fades in on top of it.
- Direction B: Ask button blooms into a full-screen light for the answer, then settles back to the room colour.
- Old Aven's light: Best match: near-black room, one soft coloured glow. The glow IS the transition.
- Android 120 Hz: compositor-friendly if built from gradient layers with transform/opacity; avoid animating backdrop blur

### 3. ChatGPT · `60fps-chatgpt-listening-orb`
- Link: https://60fps.design/shots/chatgpt-listening · source: 60fps.design
- Verdict: One object for every state: a dot grows, spins, fills and breathes. Proof the Coach needs one shape, not a set of icons.
- What moves: 0.5-0.75 s the chat screen fades to black while a red End button and pause appear; at 0.75 s a tiny dot with a sweep-gradient ring starts spinning, and from 0.75 s to 2.8 s it grows steadily into a large ring that spins faster;
- Direction A: Orb in the centre key on Day line could grow out of the Log key into this on press.
- Direction B: Ask button could become this orb full screen.
- Old Aven's light: Fits the dotted orb idea, but the sweep ring is grey on black, not coloured light. Replace the sweep with dots and coral glow.
- Android 120 Hz: compositor-friendly for the spin and grow; blob morph needs care

**Also kept:**
- `own-02-orb-thinking` Glass orb concept (release clip 02): Reads as alive and thinking without moving the shape. Depth comes from highlights and a thin rim, not from wobble. 
- `own-20-input-bar-prompt-swap` AI assistant input bar concept (release clip 20): Suggestion text changes without sliding, resizing or flashing: a staggered blur-dissolve per word. The orb is alive but small. 
- `web-mf-chat-typing` MacroFactor: The wait is shown honestly with typing dots, replies arrive one at a time, and the reply chips make answering one tap. https://screensdesign.com/apps/macrofactor-macro-tracker/
- `galleries-grok-dot-grid-generating` Grok, via Ripplix: It makes 'thinking' feel like something developing, using only dots and blur. The dot grid is the closest thing I found to Aven's dotted orb. https://www.ripplix.com/library/load-loop-grok-productivity-tools-mobile-app
- `galleries-dribbble-voice-waveform` Dribbble shot, AI Assistant - Voice Interaction Design by AmazingUI: Looks like light, not a bar chart. Amplitude changes are fast but the ribbons have inertia so it never looks jittery. https://dribbble.com/shots/27180603-AI-Assistant-Voice-Interaction-Design-by-AmazingUI
- `web-mf-plan-orbit` MacroFactor: A thinking state with a clear rhythm that shows progress through words, not a spinner; the calm tone suits a Coach that is working out a proposal. https://screensdesign.com/apps/macrofactor-macro-tracker/
- `web-arc-browse-for-me` Arc Search: The assistant's work is shown as readable steps (query, reading sources, answer) with a soft blur edge as the only decoration. https://screensdesign.com/apps/arc-search-find-it-faster/
- `web-dribbble-halden-ask-bar` Petras Nargela for Flair (shot: Halden - Ask Halden): One element turns into the conversation. Nothing flies in from nowhere, the bar's own text becomes the first message. https://dribbble.com/shots/27842958-Halden-Ask-Halden
- `galleries-chatgpt-creating-image` ChatGPT iOS, via Ripplix: The single dot is the quietest possible 'thinking'; the soft gradient placeholder promises something is coming without a spinner. https://www.ripplix.com/library/load-loop-chatgpt-productivity-tools-mobile-app
- `galleries-dribbble-glass-sphere-voice` Dribbble shot, Sphere - AI Assistant Voice Interaction Design: Calm. Nothing explodes; the listening state is just a coloured line breathing inside clear glass. https://dribbble.com/shots/27192237-Sphere-AI-Assistant-Voice-Interaction-Design

## Sheets and tabs (Opening into detail, moving between tabs)
### 1. motion-primitives morphing dialog on mobile (release clip 09) · `own-09-card-expand-collapse`
- Link: https://motion-primitives.com · source: Omar's clips
- Verdict: Your own clip. A card grows into its page from where you touched it and shrinks back along the same path. The textbook move, done right.
- What moves: At 0.375 s the 'Play' pill dims under the finger; at 0.5 s the cover image has already jumped to a rounded card the size of the viewport top and by 0.625 s it is about 90% grown; by 0.75 s the cover fills the width, title and Play button slide down into place, the body text fades up behind (about 300 ms total, ease-out, no overshoot).
- Direction A: Tapping a session or meal band opens its detail growing from that band.
- Direction B: Tapping a Today row grows into Train/Food detail.
- Old Aven's light: Motion that grows from what you touched.
- Android 120 Hz: compositor-friendly once measured; border-radius animation is the only paint cost

### 2. Family · `60fps-family-sheet-morph`
- Link: https://60fps.design/shots/family-dynamic-sheet-morph-interaction · source: 60fps.design
- Verdict: One sheet changes its content and height in place instead of stacking a second sheet. Depth never piles up.
- What moves: 0.33-0.42 s an options sheet shows three rows and the tap ripple lands on 'View Private Key'; at 0.5 s the three rows blur and fade while the new Private Key content fades in; at 0.5-0.67 s the sheet's height grows upward to fit the new content; from 0.67 s it is settled with the Cancel/Reveal buttons; the backdrop stays dimmed throughout.
- Direction A: Opening a detail inside the same sheet (a set, a meal).
- Direction B: Not as relevant.
- Old Aven's light: Sheet would need to be clear glass; the content cross-fade is the idea.
- Android 120 Hz: needs care (height change)

### 3. Motion demo · `code-motion-smooth-tabs`
- Link: https://motion.dev/examples/react-smooth-tabs · source: motion.dev examples
- Verdict: The tab pill slides and the panels blur across, so tabs feel like one world changing, which the taste research said was missing.
- What moves: Tab tap at 0.0 s: the white pill slides to Settings over about 300 ms with a spring; at the same time the old panel blurs and fades out (0.1-0.3 s), the new one blurs in with its icon colour changing, counts (8, 3, 5) arrive with it. Panel height eases to the new height.
- Direction A: Today | Plan | Progress tab bar.
- Direction B: Today | Train | Food | Progress bar.
- Old Aven's light: A glass pill over dark; coral for the selected tab.
- Android 120 Hz: needs care (blur on a large panel; use opacity only or a small blur on Android)

**Also kept:**
- `own-12-today-cards-expand` Apple-Today style cards, motion.dev example (release clip 12): The textbook iOS card expansion, done cleanly with correct timing and a scrim that keeps context visible. https://motion.dev
- `60fps-bevel-fab-ask-menu` Bevel: One key in the tab bar opens a menu above itself; the orb sits in the middle of the actions as the AI entry. The blur of the room behind gives a clear sense of depth. https://60fps.design/shots/bevel-fab-icon-rotate-menu-pop-interaction
- `galleries-dribbble-grow-sheet` Dribbble shot, Choose Product Action Sheet View - Interaction Design: The detail comes straight from the tap point and the shape is physical (surface tension). It is the most literal 'grows from what you touched' I saw. https://dribbble.com/shots/6285557-Choose-Product-Action-Sheet-View-Interaction-Design
- `code-motion-sheet-modal` Motion demo: A real draggable bottom sheet with a damped spring rather than a CSS ease; the same pattern as iOS. https://motion.dev/examples/react-sheet-modal
- `galleries-dribbble-morph-sheet` Dribbble shot, Add To Cart Bottom Sheet - Interaction Design: Button and sheet are one object: the sheet is the button expanded, so the tap feels like opening it. https://dribbble.com/shots/7397038-Add-To-Cart-Bottom-Sheet-Interaction-Design

## Records and rewards (Satisfying, never cheesy)
_Gap:_ Reward was the thinnest job: most of what's out there is confetti.

### 1. Nike Run Club · `60fps-nike-achievement-takeover`
- Link: https://60fps.design/shots/nike-run-club-achievements · source: 60fps.design
- Verdict: The record grows out of the card you touched, then the badge fades in and the words rise. Loud colour, quiet motion, no confetti.
- What moves: at 4.0 s the achievements grid shows a lime card and a dark card; at 4.3 s the lime fills upward from the bottom edge, expanding the card's colour over the grid in about 250 ms (4.3-4.6 s); at 4.8-5.2 s the diamond badge fades and scales in from faint to solid over about 400 ms; 5.2-5.5 s the words 'AWARD UNLOCKED' rise in;
- Direction A: A finished-workout record screen after the last set.
- Direction B: A reward poster screen in the Progress room.
- Old Aven's light: Aven could do this in coral on black; the take-over from the tapped card is the part to steal.
- Android 120 Hz: compositor-friendly with clip-path or scaled layer

### 2. Fitness Wrapped (concept) · `60fps-fitness-wrapped-count-up`
- Link: https://60fps.design/shots/fitness-wrapped-minutes-count-up-animation · source: 60fps.design
- Verdict: A count-up where the big digits lock in first and the number lights up only when it lands. Perfect for 'strongest bench yet'.
- What moves: 0.25-0.5 s a faint '0' appears in the dark green glow; 0.5-1.4 s the digits blur and spin quickly: the first digit and comma lock in ('1,' then '2,' then '3,' then '4,') while the later digits remain a smeared roll; by ~2.0 s the count lands on 5,151 and the blur clears; at about 3.0 s the number brightens to lime green and the subtitle fades in underneath.
- Direction A: A day total or weekly total count-up on the Progress tab.
- Direction B: Poster number rising when you open the Progress room.
- Old Aven's light: Lime-green on dark with a gentle glow matches the idea of a room lit by one colour; swap for coral.
- Android 120 Hz: compositor-friendly for translate; blur needs care

### 3. Elevate (brain training app), via Ripplix · `galleries-elevate-score-flash`
- Link: https://www.ripplix.com/library/loop-success-elevate-wellness-mobile-app · source: ripplix.com
- Verdict: Count-up, a ring drawn around one shape, and a glow behind it. Soften the white flash to a gentle pulse and it's a finish ceremony.
- What moves: 0.0-2.0 s the score runs 3696, 5456, 7216, 8976, 9114 (fast count that eases to a stop). At 2.0 s a thin white outline draws around the hexagon badge and an XP pill slides up. At 3.4 s the whole screen flashes near white for ~150 ms, then the hexagon turns solid white on a dark red room lit by a soft glow behind it (3.6-4.0 s), then it relaxes back to a pink outlined hexagon with a faint ring that pulses out…
- Direction A: Day line: the one big number could run up like this when a session closes, then the band gets its tick.
- Direction B: Rooms: a poster number counting up on the finish screen with a glow behind it.
- Old Aven's light: Good: dark room, one coloured glow rising behind a single shape, thin number. Swap pink for coral and cut the white flash.
- Android 120 Hz: compositor-friendly (number tween is the only JS; keep it in tabular figures)

**Also kept:**
- `web-opal-gem-reveal` Opal: Anticipation built by several small taps, then one clean release. The reward is a single object on pure black with nothing else on screen. https://screensdesign.com/apps/opal-screen-time-control/

## Today changing (Through the day)
_Gap:_ Nothing showed a whole day passing. These three change the room's colour with a value. For the day itself, see the Tiimo day band in Stills.

### 1. Ultrahuman · `60fps-ultrahuman-score-colour-shift`
- Link: https://60fps.design/shots/ultrahuman-room-score-ring-animation · source: 60fps.design
- Verdict: The room's colour moves from green to amber as the number flips, then one word appears. State told by light and a word, slowly enough to feel.
- What moves: at 1.5-2.8 s the score '91' sits in a ring on a deep green glow that fades into black; at 2.9-3.3 s the digits flip down to '79' (blurred transition, 3.1-3.2 s) while the background glow cross-fades from green to amber over ~700 ms (2.9-3.6 s); the ring and number turn orange together; at 3.6 s a one-word label 'Unhealthy environment' fades in under the number; the chart below stays green.
- Direction A: The Day line's now-mark could tint the room as the day goes well or badly.
- Direction B: Exactly the plan: state shown by colour plus a word, with the poster number flipping when the state changes.
- Old Aven's light: Dark room lit by one soft coloured glow that changes with state: the closest match to old Aven's light found.
- Android 120 Hz: compositor-friendly (cross-fade opacity)

### 2. Train · `60fps-train-recovery-pager-colour`
- Link: https://60fps.design/shots/train-workout-recovery-graph · source: 60fps.design
- Verdict: Swipe between muscles and the ring, number, word and background colour all move together through the in-between shades.
- What moves: 0.5-0.7 s a large ring shows 'Triceps 100% Recovered' on a pale green screen; at 0.8-1.0 s the page zooms up as the user begins to swipe; at 1.1-1.3 s the text slides sideways and swaps to 'Shoulders 78%, 2 days to recovery'; during 1.4-1.9 s the ring arc shortens, its colour goes from green to olive to orange and the whole background tint fades from green to peach; the next pages continue to red at 21%.
- Direction A: Today's recovery or readiness per muscle as a paged view.
- Direction B: Rooms where each room has a poster number and state colour.
- Old Aven's light: Light theme, but the idea of a tinted background is the same.
- Android 120 Hz: needs care (SVG arc animate); otherwise compositor-friendly

### 3. Apple Fitness · `60fps-apple-effort-slider-colour`
- Link: https://60fps.design/shots/apple-fitness-effort-slider · source: 60fps.design
- Verdict: Drag a value and the whole sheet's colour follows. Good for 'how hard was that', and for a Today whose glow follows the day.
- What moves: 0.5-0.67 s a bottom sheet 'Rate Your Effort' rises over the workout summary; the slider thumb sits at the left on a teal-green gradient labelled 'Easy'; as the thumb is dragged (1.8-2.8 s) the background gradient cross-fades teal to blue to violet over about 1 s and the label changes to 'Moderate' then 'Hard'; the bars grow taller toward the right.
- Direction A: Rating a session at the end of a workout.
- Direction B: Colour plus a word is the B principle.
- Old Aven's light: A near-black sheet with a coloured glow that changes with the value: strong fit.
- Android 120 Hz: compositor-friendly

## Also exceptional (No job yet, worth seeing)
**Also kept:**
- `code-mv-mood-slider` Adrian Kuleszo (via X, listed on motionvault.dev): One drag does four things in sync (colour, fill, face size, ring) and it still looks calm. A perfect model for an RPE or soreness slider. https://motionvault.dev/adriankuleszo/status/2107523823906193698/
- `web-hwf-mood-field` How We Feel: State is a colour plus a word and a shape, and moving between states is a smooth morph, not a list. https://screensdesign.com/apps/how-we-feel/
- `code-mv-progress-button` withAnimation (via X, listed on motionvault.dev): Progress happens inside the button itself, and the escape (cancel) grows out of it. No spinner overlay. https://motionvault.dev/withanimationui/status/2107359197511692380/

## What was blocked
- **Design Spells:** HTTP 429 and a Vercel bot check for headless browsers; not bypassed, nothing watched. A normal browser on a phone probably works.
- **Mobbin:** logged out, only the Explore page's 6 random previews load (watched, none relevant). Search, apps and flows need an account.
- **Dribbble:** works logged out, and shot videos download. Mostly showreels and mock-ups; 8 shots kept.
- **Awwwards:** every request returned 502 or a reset. Nothing watched.
- **Codrops:** reachable through a real browser; demos are desktop editorial, nothing kept.
- **screensdesign.com:** free previews blur in-app screens, so most in-app tick/rest/number motion of Fitbod, Peloton, Liftoff and others couldn't be judged.
- **60fps.design Snippets** (SwiftUI code) and **Motion+** sources are paid. Viewing the clips is free.
- **Not reached:** ui.aceternity.com, motion-primitives.com, animata.design, emilkowal.ski/ui, Apple Design Award promo videos. Rive had no AI orb file.
