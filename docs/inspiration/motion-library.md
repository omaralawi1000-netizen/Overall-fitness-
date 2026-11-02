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

# Round 2 (2 Nov 2026): broader and more beautiful

Omar hearted 36 in round 1 (see `keepers.md`) and asked for more. Four Sonnet helpers aimed at what he loved (morph and grow, numbers, colour that follows a value), the three gaps, and beyond app UI (games via interfaceingame.com, Apple's Liquid Glass video, Benji Taylor's Family Values page). About 700 clips looked at, 51 kept after removing duplicates. Same page, "Round 2" tab. Files: `aven2/motion-library/r2-*/`.

## R2 · Ticking a set
_Gap:_ The 'next set becomes active' gap: the Google steps clip is the best model found. No workout app does this well; Strong just snaps.

### 1. Google app (iOS) onboarding · `r2-tick-games-google-setup-steps`
- Link: https://60fps.design/shots/google-todo-check-interaction
- Verdict: The best 'next set becomes active' found: the finished step shrinks into a check row and the next one opens in the same place. Swap steps for sets and it's the workout.
- What moves: At 0.0 s the active step card shows a small spinner. At ~0.6 s the spinner turns into a ringed check. By ~1.3 s that card has shrunk to a one-line row with a check, and the card below grows open in the space (title, a line of text, a blue Explore button). The list height stays calm: the done row is quiet grey, only the active one has a button.
- Direction A: Today band: the done session shrinks into a thin row, the next one opens in place, so the 'now' slot always carries the single action.
- Direction B: Train room: set N shrinks to a one-line check row and set N+1 opens with its inputs, so the screen never needs scrolling.
- Old Aven's light: Fits a near-black room: the open step is the only bright thing; coral for the one button.
- Android 120 Hz: compositor-friendly if done with transforms (FLIP); animating real height needs care

### 2. Redpoint (Apple Watch) · `r2-watch-log-flood`
- Link: https://www.ripplix.com/library/popup-2-select-redpoint-sports-smartwatch
- Verdict: Tap Log and its colour floods the screen while the icon and word travel to the centre, then it blurs away. A strong idea for A's Log key.
- What moves: At 9.5 s Send is pressed (button squeezes about 60 ms). By 9.7 s the other buttons dissolve while the green fills the whole screen from the button, its icon and label travelling to the centre by 9.9 s (about 250 ms). It holds about 0.8 s, then at 10.7 s the whole green screen blurs out and the logging screen returns. Flash is yellow, Clean cyan, Dab white, each flooding the same way.
- Direction A: Logging a set from the Log key: one flood of the set's colour with the number, then back to the day band.
- Direction B: Tick a set: flood the row's colour at low strength with the weight, then retreat.
- Old Aven's light: Warm colour flood on a dark screen is the old Aven room being lit by what you just did.
- Android 120 Hz: compositor-friendly

### 3. Apple (WWDC25 newsroom video) · `r2-apple-glass-toggle`
- Link: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- Verdict: Apple's Liquid Glass toggle: the knob swells into a glass capsule while you press. A tick that feels like a real object under your thumb.
- What moves: At 10.43 s the touched knob swells within about 70 ms into a wider clear glass capsule with a bright rim and refraction, the track fills green behind it (about 150 ms), then at 10.64 s the capsule springs back to a flat white knob on the right in about 150 ms, a small blur trail behind it. Total about 350 ms. Off again is the reverse.
- Direction A: The centre Log key or the tick on a set could swell into a glass capsule while pressed and settle flat on release.
- Direction B: Tick on a set in Train: the dot swells to glass while held, settles to a check.
- Old Aven's light: This is old Aven's clear untinted glass over a lit room, as a control; the green could be the coral.
- Android 120 Hz: needs care (fake with scale and blur, not true refraction)

**Also kept:**
- `r2-md-vinyl-next` Md Vinyl Player: The hand-over to the next item is visible: one object leaves, the next arrives, and the room takes its colour. That is the gap-1 idea (the next one becoming active) done with light. https://60fps.design/shots/md-vinyl-player-next-song-interaction
- `r2-tick-games-duo-path-next-node` Duolingo (iOS) chess path: The map answers 'what is next?' by lighting exactly one node and breathing it, while everything else stays grey. Colour of the section follows the stage. https://60fps.design/shots/duolingo-section-unit-complete-trophy-morph-animation
- `r2-tick-games-monument-valley-unlock` Monument Valley (mobile game): 'Next becomes active' as ceremony: a soft light appears above the door, the old thing folds away, the new one assembles itself calmly. https://interfaceingame.com/games/monument-valley/
- `r2-tick-games-particle-step-handoff` Particle News: The completed step does not vanish: it stays as a struck, dimmed line while the next step gets the black button. You read progress and 'what now' at the same glance. https://60fps.design/shots/particle-news-step-check-animation

## R2 · Entering and leaving rest
### 1. Peace Out (iOS) timer · `r2-tick-games-peaceout-conic-rest`
- Link: https://60fps.design/shots/peace-out-timer-screen-animation
- Verdict: A ring of light closes to black around a quiet clock, then re-opens. Rest as an event, calm and readable.
- What moves: Tap to start: the red conic fan is pulled to a ring that closes in toward the centre over ~1.5 s (0.6–2.0 s) while the time '0:01' fades in; by ~2.4 s the screen is plain black with a white clock and the wall time, and it stays calm for 6 s. At ~8.4 s a dim purple ring opens up from the edges, the light re-fills as a purple then blue fan, and 'peace out' returns.
- Direction A: Rest timer takes the whole phone: light closes to the number, opens again as the set returns.
- Direction B: Same: light retreats to the clock, comes back for the next set.
- Old Aven's light: The collapsing light is the old Aven glow used as a clock: orb light shrinks to a dot, grows into the room again.
- Android 120 Hz: needs care (animating gradient/mask is paint, not compositor); fine on canvas or as masks of opacity

### 2. Miles app (60fps.design) · `r2n-miles-countdown-blur-flip`
- Link: https://60fps.design/shots/miles-numbers-countdown-flip-animation/
- Verdict: A 3-2-1 where each number blurs and flips into the next. Same family as the Push countdown you loved, quieter.
- What moves: The thin white 3 holds sharp, then from 0.42 s slides down and out blurring while the 2 slides in from above, both blurred and overlapping at 0.5 s, the 2 sharpening by 0.67 s. About 250 ms per swap, then holds still.
- Direction A: Rest timer's last-3 seconds.
- Direction B: Poster countdown.
- Old Aven's light: Thin light digit fits.
- Android 120 Hz: needs care (blur); tiny area, fine

### 3. Tiimo (iOS) focus timer · `r2-tick-games-tiimo-ring-solid`
- Link: https://60fps.design/shots/tiimo-circular-swipe-to-finish-focus-timer
- Verdict: The timer ring closes solid, then dissolves into the next screen. A clean way to leave rest.
- What moves: The purple arc with a small check handle sweeps round in ~1.2 s when the user finishes the timer (swipe). At ~1.8 s it is a closed ring, the time and buttons fade out (1.9–2.5 s), the disc fills a lighter purple, then at ~4.2 s the ring itself fades and the next screen text rises from the white; confetti-free.
- Direction A: Finish the set or rest by closing a ring, which then dissolves into the Log key.
- Direction B: Same for the rest timer ending: the ring closes and turns into the next set's row.
- Old Aven's light: Light mode; the closing ring in a thin glow on black would suit.
- Android 120 Hz: compositor-friendly

**Also kept:**
- `r2-tick-games-hollow-knight-rest` Hollow Knight (game): Rest is a bloom and then quiet: light up, light out, nothing else moves. The HUD refilling is the only information. https://interfaceingame.com/games/hollow-knight/

## R2 · Numbers changing
### 1. Family (Benji Taylor) · `r2-family-continue-confirm`
- Link: https://benji.org/family-values
- Verdict: Continue morphs into Confirm through the shared letters while the typed amount shrinks and travels to the next screen. Nothing teleports.
- What moves: At 0.5 s the Continue button is tapped. Over about 400 ms the big $1.00 shrinks and slides from the middle to the right-hand row of the next screen while the rest of the old screen blurs out and the new one blurs in; the button label morphs Continue into Confirm, keeping the shared letters Con and swapping the rest, with a small icon sliding in. The amount you typed is the one thing that visibly travels.
- Direction A: Accepting a Coach proposal: the proposed weight or calories carries across into the confirm and the Day line keeps it.
- Direction B: One huge poster number that shrinks into the confirm row is exactly the Rooms 'one big number per screen' idea.
- Old Aven's light: Thin light numbers travelling on black is the old Aven look; the label morph fits the coral 'one thing to tap'.
- Android 120 Hz: compositor-friendly for the number; needs care for per-letter blur

### 2. Runmo onboarding (60fps.design) · `r2n-runmo-days-stepper`
- Link: https://60fps.design/shots/runmo-days-counter-interaction/
- Verdict: The digit rolls with motion blur while the day pills light up in step. A weight or rep stepper with a body.
- What moves: Tapping + or - rolls the big digit vertically with motion blur: at 2.9 s the 2 is a smear, settles to a sharp 3 by 3.17 s, next to 4 and 5 in ~170 ms steps. At the same time the week pills (M T W T F S S) below fill white or dim, and the end buttons grey out at 1 or 7.
- Direction A: Reps and weight steppers with a rolling digit.
- Direction B: Poster number roll.
- Old Aven's light: Thin light digits roll fits.
- Android 120 Hz: needs care (blur on text); 2 digits only, fine

### 3. The Outsiders sleep app (60fps.design) · `r2n-outsiders-sleep-goal-colour`
- Link: https://60fps.design/shots/the-outsiders-sleep-goal-slider-interaction/
- Verdict: One slider moves a thin number, a widening wedge and the button colour together. Colour follows the value, which you hearted three times.
- What moves: Dragging the handle, the monospace time reads 8:00, 8:40, 9:00, 9:20 ... 11:10 with a ghost leading zero. A cyan wedge widens behind the handle (thin at left, fat at right), a magenta 'above recommended' tag appears at ~3.2 s, and the Done button fades cyan to blue to indigo to violet as the value rises.
- Direction A: Weight, reps or calories dial where the button colour tells you how far you've pushed.
- Direction B: Colour plus word state.
- Old Aven's light: Neon on near-black, close to old Aven's night.
- Android 120 Hz: compositor-friendly for colour crossfade; wedge reshape is cheap path

**Also kept:**
- `r2n-health-emotion-bloom-slider` Apple Health emotion slider (60fps.design): A continuous shape, hue, background, button and word all driven by one number. https://60fps.design/shots/apple-health-emotion-slider/
- `r2n-revolut-glow-graph-scrub` Revolut price chart (60fps.design): Only the part of the line near the finger lights up; the number is the readout. https://60fps.design/shots/revolut-graph-glow-drag-interaction/
- `r2n-world-live-digit-trail` World app widget (60fps.design): Per-digit rolling with the stable leading digits untouched. https://60fps.design/shots/world-app-register-number-flip-animation/

## R2 · A Coach proposal
_Gap:_ Undo: no great undo toast exists in public libraries. The Family bin, where things wait to be recovered, is the closest.

### 1. Family (Benji Taylor) · `r2-family-approval-unfolds`
- Link: https://benji.org/family-values
- Verdict: An approval tray unfolds out of the keypad, cross-blurs between steps and folds back on Cancel. A Coach proposal arriving, accepted and cancelled in place.
- What moves: At 0.4 s Continue on the swap keypad is tapped; a dark card slides up out of the keypad's own area (about 300 ms) showing a lock icon sliding from locked to unlocked with ripple rings. Tap again at 2.1 s: the text blur-swaps ('Your approval is required' becomes 'Deciding what to approve') and the card grows taller (about 250 ms).
- Direction A: Coach proposal card unfolding from the row it refers to in the Day line, Accept closes it back onto the band.
- Direction B: Coach proposal from the Ask button or the poster number: opens in place, Cancel returns to the exact same number.
- Old Aven's light: Dark glass card on a near-black room matches old Aven. The lock's small ring ripple is the one soft glow.
- Android 120 Hz: needs care (height and blur)

### 2. Family (Benji Taylor) · `r2-family-trash-bin`
- Link: https://benji.org/family-values
- Verdict: Items drop into a bin you can recover them from later. The closest thing to a calm undo for a dismissed proposal.
- What moves: At 2.3 s Trash is tapped with three cards selected. Within about 150 ms the screen blurs out and the selected cards (tilted, overlapping, still showing their check marks) lift out of the grid and drop into a skeuomorphic white bin that fills the sheet, with a red Trash 3 button and a quiet Cancel. At 4.0 s after confirming the grid returns with those items gone.
- Direction A: Dismissing a Coach proposal or deleting logged sets could drop the card into a tray with Cancel and a quiet 'you can bring it back'.
- Direction B: Delete a meal or a set: the selected rows stack and drop into a bin sheet.
- Old Aven's light: One tilted stack of glass cards falling into a soft dark well fits the room-lit-by-glow look, if the bin is a glass hollow rather than a drawn object.
- Android 120 Hz: needs care (blur plus large transform of several layers)

### 3. Eimi · `r2-eimi-card-sheet-to-list`
- Link: https://60fps.design/shots/eimi-card-move-from-sheet-to-page-interaction
- Verdict: A card moves from the sheet into its place in the list. Shows where an accepted change went.
- What moves: At 0.4 s Done is tapped on the All Set sheet; the teal card that was shown in the sheet lifts out and glides down in about 400 ms while the sheet drops away and the backdrop lightens, landing as the first card in the list at 1.0 s with its title now small and left aligned.
- Direction A: Accepting a Coach proposal: the proposal card flies into the Day line slot it changes.
- Direction B: Accepting adds the item to Train or Food and it lands in the list.
- Old Aven's light: A solid coloured card gliding is less glassy; with a glass card it fits.
- Android 120 Hz: compositor-friendly

**Also kept:**
- `r2-fivecents-delete-sheet` Five Cents: Two-step undo-able destructive action that never leaves the thumb. The confirm sits exactly where the first tap was. https://60fps.design/shots/five-cents-delete-transaction-sheet

## R2 · The Coach listening, thinking, answering
### 1. Ultrahuman (iOS) · `r2-ultrahuman-light-orb-floods-room`
- Link: https://60fps.design/shots/ultrahuman-sleep-analysis-pulse-animation
- Verdict: A thin lit arc closes into a disc that fills with light, the glow swells and the screen opens out of it. Your 'orb whose light becomes the room', with a real job: the wait.
- What moves: On black, a thin lit arc draws at ~2.0 s while the label cross-fades ("Calculating sleep index" to "Analysing last night's sleep", word by word). At 2.5 s the arc closes into a dark disc with a bright rim and a faint halo. Over ~1.2 s (2.5-3.7 s) the disc fills from within, grey to pale white, and the halo widens into the room.
- Direction A: The centre Log key (or the day-band) could be this orb: tap, it lights, and Today opens out of its glow.
- Direction B: Ask button as the orb: tapping it lights a disc that swells until the Coach answer fades in under it.
- Old Aven's light: Direct match: near-black room, one soft glow as the only light, thin light type. Swap the grey for Aven's coral/warm glow.
- Android 120 Hz: compositor-friendly (scale/opacity of pre-blurred layers). Avoid animating the blur radius itself.

### 2. Wabi (iOS) · `r2-wabi-glass-sphere-dusk-sky`
- Link: https://60fps.design/shots/wabi-soothing-loading-fade-reveal-animation
- Verdict: A glass sphere with a reflection on a sky that moves through dusk while the AI works, then blurs into the answer. Light with a source, and glass.
- What moves: A thin circle at 1.0 s fades and becomes a glass sphere at ~1.8 s with a soft mirrored reflection under a horizon line. From 1.8 to 3.0 s the whole sky sweeps pale grey, lilac, deep purple, then sunset orange and red bands, with the reflection pooling below.
- Direction A: The "now" mark could be a glass bead on a horizon whose sky colour is the time of day.
- Direction B: Coach thinking state: sky drifts while it works, then blurs into the proposal cards.
- Old Aven's light: Very close to old Aven: one coloured light field, clear glass object on top. Add italic serif for the status line.
- Android 120 Hz: needs care: full-screen gradient repaint is costly; pre-render the gradient bands as big layers and move them with transform. Blur-out at the end is brief so it is fine.

### 3. Perplexity (iOS) · `r2-perplexity-particle-orb`
- Link: https://60fps.design/shots/perplexity-voice-ask-anything-dot-pattern-interaction
- Verdict: A ring of dust grows into a sphere of dots with no outline. Inverted to warm dots on black, it's old Aven's dotted orb, alive.
- What moves: A thin ring of tiny dots at 0 s grows over ~0.9 s into a dense stipple sphere (dots fill inward as it scales). It then holds and slowly shimmers; later (~3.5-7 s) it pulls apart into crescents and arches of dust and re-forms, so the speech has a shape. "Connecting" fades out at ~0.4 s.
- Direction A: Day-line centre key as a particle orb.
- Direction B: Ask button idle state is the particle sphere; it tears into shapes while the Coach talks.
- Old Aven's light: On black with warm light-coloured dots (instead of dark dots on white) it is the dotted orb of old Aven, more alive.
- Android 120 Hz: heavy-ish: canvas with thousands of points on the main thread; use WebGL points or OffscreenCanvas, cap at ~2000 points, 120 fps is realistic on a S26 with WebGL.

**Also kept:**
- `r2-appleintel-ring-blooms-to-gradient` Apple Tips (iOS): A single mark turns its own glow into the room. The speed is the lesson: 0.5 s from ring to full wash, smooth with no steps. https://60fps.design/shots/tips-discover-apple-intelligence-animation
- `r2-arc-gradient-rises-while-thinking` Arc Search (iOS): The colour is the progress: slowly changing, always soft-edged, never a bar. Text goes from blur to sharp as the answer lands. https://60fps.design/shots/arc-search-ai-generation-loader
- `r2-playground-glass-bubble` Apple Image Playground (iOS): A glass object with a source of light on its rim, not a flat orb; the rim colour keeps travelling so it feels alive without any shape change. Merge into the result is a clean hand-off. https://60fps.design/shots/apple-playground-generation-interaction
- `r2-mymind-drifting-gradient-serif` mymind (iOS): The calmest "drifting gradient" in the set. Serif type on a moving light field feels expensive and unhurried, and the motion does not compete with the text. https://60fps.design/shots/mymind-serendipity-waitlist
- `r2-bevel-coach-persona-glow` Bevel (iOS): Colour follows the choice, everywhere at once (avatar, wash, chips, button). It is a character with a mood, not a logo. https://60fps.design/shots/bevel-health-personality-avatar-animation

## R2 · Sheets and tabs
### 1. Family (Benji Taylor) · `r2-family-tray-heights`
- Link: https://benji.org/family-values
- Verdict: Benji Taylor's own Family recording: one tray re-fits its height for each step, anchored to the bottom, with a cross-blur. The sheet you loved, in full.
- What moves: At 1.8 s the Continue button is tapped and the tray content cross-blurs (chain list into amount tiles) while the white tray grows taller in about 250 ms, anchored to the bottom, no jump. Tiles settle in 100 ms steps. Later the tray swaps to a keypad (amount typed with big digits), then to a review list, each time with a different height so you can see it changed.
- Direction A: A proposal tray (Coach suggests a change) could grow into its detail and then its confirm in place, bottom anchored, the day band staying visible behind.
- Direction B: Fits Rooms well: Ask opens one tray that becomes the answer, then the proposal, then confirm, without leaving the screen.
- Old Aven's light: Frosted tray over the dark room; the heights and cross-blur are the whole effect, no extra colour needed.
- Android 120 Hz: needs care (height changes layout; text blur per frame)

### 2. Days · `r2-days-card-to-page`
- Link: https://60fps.design/shots/days-event-card-morph
- Verdict: An event card morphs into its page, the shape and content flowing across.
- What moves: At 0.4 s the Thanksgiving card is tapped. Over about 250 ms it grows to the full phone with its corner radius opening to the device corners, the photo scaling to full screen, and the white title lifting from the card bottom to its place near the bottom of the page, bigger. The list behind dims. Back reverses it.
- Direction A: Tap a day-line item to open its detail as the same card growing.
- Direction B: Today card to Train or Food room.
- Old Aven's light: Photo glow filling the screen then settling dark matches the lit room; for Aven the card would hold a glow rather than a photo.
- Android 120 Hz: compositor-friendly (clip-path radius needs care)

### 3. Not Boring Vibes · `r2-vibes-menu-fab`
- Link: https://60fps.design/shots/not-boring-vibes-menu-fab
- Verdict: Not Boring's + key opens its menu out of itself with real weight.
- What moves: At 1.75 s the small dark corner button is pressed; within about 170 ms a dark blurred disc grows from that corner past the screen edge (frame 1.83 to 1.92 s), the scene behind blurs, then a title (Focus) and five rounded icons fade in over the frosted layer by 2.1 s.
- Direction A: The centre Log key (or orb) swells into a full-screen log sheet from where it sits.
- Direction B: The Ask button opens the Coach room as a circular reveal from the button.
- Old Aven's light: Dark frosted menu over a lit scene: old Aven's glass; the icons would be coral accents.
- Android 120 Hz: needs care (full-screen backdrop blur; keep it a pre-blurred still layer if janky)

**Also kept:**
- `r2-family-menu-to-speedup` Family (Benji Taylor): A menu inside a sheet that hands over to the next sheet without closing, plus a number that settles into place, so the user sees data arrive rather than pop in. https://benji.org/family-values

## R2 · Records and rewards
### 1. CRED (iOS) milestones · `r2-tick-games-cred-milestone-glow`
- Link: https://60fps.design/shots/cred-milestone-badges-interaction
- Verdict: A near-black room, a metal badge, a lowercase serif name and a soft glow in the badge's colour that cross-fades as you swipe. Old Aven's room, as a record screen.
- What moves: Near-black room, a metal-rimmed badge centred, its serif lowercase name below ('time keeper'). A soft off-centre gradient glow in the badge's own colour (green, gold, teal, magenta) fills one corner. Swiping to the next badge slides the badges ~0.4 s, cross-fades the glow colour over ~0.5 s and swaps the title. Locked badges are grey metal with a lock and the glow goes out to black.
- Direction A: Progress: record medals as one swipeable room.
- Direction B: Same under 'Records' inside Progress.
- Old Aven's light: This is old Aven's room: near-black, one soft coloured glow, serif names; locked state = glow off.
- Android 120 Hz: compositor-friendly (opacity/transform), gradient cross-fade is two stacked layers

### 2. Any Distance (iOS) achievement · `r2-tick-games-anydistance-medal`
- Link: https://60fps.design/shots/any-distance-badge-showcase
- Verdict: A black medal turns edge-on and a gold edge-light catches the number as it faces you. The light is the animation.
- What moves: A matte black pill-shaped medal with a bronze '1' on a black screen with faint gold specks. It turns edge-on (0.35–1.05 s, thin sliver), shows its dark back for a moment (1.2–2.6 s), then turns back at ~2.8–3.9 s; on the way a warm gold edge-light runs along the numeral so the '1' lights up from the side before the face is frontal.
- Direction A: Day line: a streak day-count medal on black.
- Direction B: Progress: record medal; 'day 12' as a lit numeral.
- Old Aven's light: Almost the old Aven finish: near-black, soft warm light, thin numeral.
- Android 120 Hz: compositor-friendly (transform), shader-free if baked

### 3. Monument Valley (mobile game) · `r2-tick-games-monument-valley-complete`
- Link: https://interfaceingame.com/games/monument-valley/
- Verdict: Touch the glowing cube, one ring and COMPLETE fade in, and the camera slowly pulls back. A finish with no confetti and no number.
- What moves: The character walks to the top and touches a glowing teal cube (≈11.0–13.3 s); the cube lifts and opens. At ~14.2 s a single small ring and the word COMPLETE fade in at the bottom, and at ~15.3 s a thin circular ripple spreads from the cube. From 16 s the camera slowly pulls back (≈4 s) and the whole tower is seen, with ripples still fading. No fireworks, no number.
- Direction A: Day line: end of day pulls back to show the whole day band with one soft ripple.
- Direction B: Rooms: workout finish zooms out from the last set to the whole workout as one picture.
- Old Aven's light: Muted, dark room, one teal glow, one ring: exactly the old finish tone.
- Android 120 Hz: compositor-friendly if rebuilt as scale + ring ripples

**Also kept:**
- `r2-tick-games-opal-gem-crack` Opal (iOS) gem unlock: A cleaner recording of the Opal gem you loved in round 1. https://60fps.design/shots/opal-gem-unlocked-animation
- `r2-growpal-badge-flip` Growpal: One object, one clean reveal, glow behind it. It is Opal's gem idea on a lighter sheet: dark back flips to the lit front. https://www.ripplix.com/library/popover-flip-growpal-wellness-mobile-app
- `r2-tick-games-nb-gold-piece` Not Boring Habits (reward unlock): A collectable that is built from your days: today's tick adds one real piece. Anticipation is the piece falling for ~0.8 s, the reward is one clean click on black. https://60fps.design/shots/not-boring-habits-reward-unlock-animation
- `r2-tick-games-apple-badge-flip` Apple Fitness (iOS awards): The object is the whole screen: black, one badge, the light moves over it. The rotation is fast and the settle is quiet, no confetti. https://60fps.design/shots/apple-fitness-metal-badge-showcase
- `r2-tick-games-iam-habit-sprig` I Am (affirmations) daily habit sheet: A reward that is a drawing, not a burst: the day's check literally grows something, line by line, and it keeps growing slowly instead of ending in a flash. https://60fps.design/shots/i-am-daily-habit-sheet-check-and-illustration-animation
- `r2-tick-games-supersonic-card-lift` Supersonic (iOS) achievements: A collection where locked = silhouette and earned = lit. The lift-and-dim is simple and the rim light gives the card presence. https://60fps.design/shots/supersonic-achievements-gyroscope

## R2 · Today changing
_Gap:_ The 'Today through the day' gap is solved here: three apps that repaint the sky as time moves.

### 1. Apple Watch Solar Dial face (60fps.design) · `r2n-solar-dial-day-scrub`
- Link: https://60fps.design/shots/apple-watch-solar-dial-watch-face/
- Verdict: Apple's Solar Dial: the sun and moon move along an arc, the sky goes day, twilight, night, and the label and time follow. The best 'moving now' for a day line.
- What moves: Turning the crown, a sun glyph travels an arc around a 24 h dial while the face behind it re-skies: bright blue day, then at 3.2 s a pale horizon, 3.3-3.6 s a pink/orange sunset band with the label changing DAY to CIVIL TWILIGHT to NAUTICAL TWILIGHT, then at 4.6 s deep indigo NIGHT with a pale moon arc. The centre time counts 12:03, 12:56, 1:58, 3:41 ... with a small signed offset to now beneath.
- Direction A: The best model for a moving now on a day timeline with a time-of-day palette.
- Direction B: Word label (DAY, NIGHT) plus colour as state.
- Old Aven's light: Dark night face with a single coloured glow ring is close to old Aven.
- Android 120 Hz: compositor-friendly if baked; sun/moon arc is cheap SVG/transform

### 2. Moods · `r2-moods-pills-expand`
- Link: https://60fps.design/shots/moods-faster-pills-morph-expand-interaction
- Verdict: Tap a colour pill and it grows tall while the whole room's glow takes its colour. Grow-from-touch and colour-follows-value in one.
- What moves: At 0.17 s the tapped orange pill starts to grow; by 0.33 s it is a tall pill at the centre, with the others receding and dimming left, the room glow turning orange behind it, a label (Very Pleasant) fading in above and an arrow button inside. About 250 ms grow. Back at 0.9 s it shrinks to its row slot and the glow drains to dark. Each other pill does the same in its own colour (purple, blue, yellow).
- Direction A: Log key: tap and it grows into a state pill (hungry, sore, strong) with the room glow in that colour, then returns.
- Direction B: One state chip per room growing from the poster number's row; the glow colour matches the state word.
- Old Aven's light: Exactly old Aven: near-black room lit by one coloured glow, glassy pills.
- Android 120 Hz: needs care (pill size is layout unless done as scale; glow should be a pre-blurred layer)

### 3. Good Air weather app (60fps.design) · `r2n-good-air-sky-scrub`
- Link: https://60fps.design/shots/good-air-time-slider-dynamic-weather-interaction/
- Verdict: Drag time and the whole screen goes blue sky, red sunset, dark night, with the text colours following.
- What moves: A thin time scrubber sits under the big temperature. Dragging from 4 PM to 6 PM, the blue day sky holds, then at ~4.5 s the whole screen swaps in about 170 ms to a red sunset with a glowing sun, then within another 400 ms fades to a dark night with soft clouds. The temperature drops 30 to 26 and the text and nav bar flip from dark-on-light to light-on-dark in step.
- Direction A: Today screen gets a time scrubber: drag to preview your evening, the room colour follows the hour.
- Direction B: Poster number on a sky that follows the hour; colour plus word state.
- Old Aven's light: Near-black night state is close to old Aven's lit room; sunset glow as the one coloured light.
- Android 120 Hz: compositor-friendly (opacity crossfade of pre-made layers); cloud blur textures need care

**Also kept:**
- `r2n-tides-sky-follows-scrub` Apple Watch tide app (60fps.design): The day's light is the interface: curve brightness, sky colour and the big number all track one cursor, no separate mode switch. https://60fps.design/shots/apple-tides-raise-fall-scroll-interaction/
- `r2n-lumy-sunrise-scrub` Lumy sunrise app (60fps.design): Real horizon, a sun disc that blooms and recedes, and a haptic-feeling ruler; the sky is a precise function of time. https://60fps.design/shots/lumy-time-slider-interaction/
- `r2-ben-journal-stack-to-list` Ben Journal: The fan of cards that was the screen becomes a small mark in the new header, so the user can see the same objects continue. https://60fps.design/shots/ben-journal-pull-down-morph-to-list-interaction
- `r2-lume-time-scrub-band` Lume (iOS): A dark room with a single hot band of light that you move with your thumb is the most Aven-looking Today in the set. The AI line arriving as typed text under it is the Coach hand-off. https://60fps.design/shots/lume-time-scroll-interaction
- `r2n-world-clock-daynight-scrub` World Clock Master app (60fps.design): One gesture changes several rows consistently, each row lit by its own hour. https://60fps.design/shots/world-clock-master-time-change-on-swipe-interaction/

## R2 · Also exceptional
**Also kept:**
- `r2n-exoplan-star-gradient` Exoplan app (60fps.design): Rating as a glowing fill, not five separate taps; the next questions appear in place. https://60fps.design/shots/exoplan-rate-experience-gradient-slider-interaction/

## Round 2: what was blocked
- gameuidatabase.com and Behance: 403. interfaceingame.com works but has video for only ~20 games (none for Balatro, Hades, Alto).
- Dribbble search returned no list from the cloud this time. Ripplix per-shot clips sometimes need an account.
- apple.com, ouraring.com, raycast.com, linear.app, family.co, perplexity.ai: no public mp4; live drag demos (Rauno's craft pages) can't be filmed by the tool, which only clicks.
- whoop.com 403. Motion studios (Buck, ManvsMachine) not reached.
