# Web references

Omar's web references (added 27 Oct 2026). Treat them like the rest of the inspiration: study the principle, never copy the look. docs/TASTE.md wins over anything here, and every idea must pass the 5-second test. Use them in research and for the Checkpoint 2 directions, and say which reference shaped which choice.

Each entry has Omar's reason first, then **Learned** (what the source actually says, fetched 27 Oct 2026). **Couldn't open** marks what was blocked.

## Motion and interaction principles

### 1. Apple WWDC18, "Designing Fluid Interfaces"
https://developer.apple.com/videos/play/wwdc2018/803/
Omar: the source of interruptible, redirectable, momentum-based motion.
- **Learned:** Springs are set with two knobs, damping ratio and response, never a duration. Start at 100% damping (no overshoot) and add bounce only when the gesture carried momentum. Apple's own example: tapping the mini player opens Now Playing at 100% damping, and swiping it away uses 80%. On release, project where the momentum would carry the object (`v/1000 · d/(1−d)`, d = scroll deceleration rate) and pick the target from that, not from the finger's last position.
- **Learned:** Track 1:1 from where the finger grabbed the object. Detect a pause from the spike in finger acceleration (a timer is too slow). Rubberband at edges instead of hard stops (a hard stop feels like a frozen phone). Highlight on touch-down and confirm on touch-up. Elements leave and come back along the same path. Avoid the ~0.5 s double-tap wait.

### 2. Nathan Gitter, "Building Fluid Interfaces" (code)
https://github.com/nathangitter/fluid-interfaces
Omar: calculator button, flashlight button, momentum drawer, picture-in-picture, translated to web springs.
- **Learned (from the source files):**
  - **Calculator button:** highlights instantly on touch-down with no animation, then fades back over 0.5 s ease-out. Dragging out fades it, and dragging back in re-highlights it.
  - **Flashlight button:** grows with press force (1.0 to 1.84×). It arms at 50% force and toggles on the way back down, with hysteresis at 49% and 40%. Light haptic on arm, medium haptic on toggle.
  - **Momentum drawer:** damping 0.8, response 0.3. Initial velocity is the finger speed divided by the remaining distance, capped at 30. While dragging, the spring is critically damped (1.0 / 0.4).
  - **Picture-in-picture:** projects momentum to the nearest corner, then a critically damped spring (1.0 / 0.4) carries the finger's velocity.
  - **Rubberband:** offset = distance^0.7, and it springs back at 0.6 / 0.3. Every animator is interruptible.
- **Web note:** response/damping maps to stiffness = (2π/response)², damping = 4π·ζ/response (mass 1). Pass the gesture's velocity into the spring.
- **Couldn't open:** the companion blog post on Medium (403).

### 3. Benji Taylor, "Family Values"
https://benji.org/family-values
Omar: simplicity → fluidity → delight; the tray system as a model for sheets and the Coach; continuity through motion.
- **Learned:** Trays float over the current screen, so you keep your context. Each one does one job, has a title and a close/back icon, and gets a different height from the last so every step visibly changes. Short trays can grow into full-screen flows.
- **Learned:** Continuity means nothing teleports.
  - Tabs slide toward the tab you tapped.
  - "Continue" morphs into "Confirm" through their shared letters.
  - The amount you typed travels into the confirmation.
  - A pending spinner flies to the Activity tab.
  - Delight is scaled inversely to frequency: more surprise in rare moments (backup confetti), none in daily actions. That fits a new record versus ticking a set.

### 4. Liquid Glass in iOS 27 (MacRumors)
https://macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27
Omar: the frost must stay legible; readability beats spectacle.
- **Learned:** iOS 27 diffuses busy content behind the glass more strongly. When content scrolls under a floating bar, an even toolbar backing fades in to keep text legible. Glass got a darker edge and brighter specular highlights for separation, and it respects Reduce Transparency and Increase Contrast. Users get a clear-to-tinted slider.
- **For us:** frost strength should rise when what's behind it is busy. Separate layers with edge and highlight, not heavier blur.

### 5. Siri in iOS 27 (MacStories review)
https://www.macstories.net/stories/ios-and-ipados-27-review/5/
Omar: the orb grows out of existing UI instead of covering the screen; listening, thinking and speaking states. Ours must be our own.
- **Learned:** A dark glass orb drops out of the Dynamic Island (on iPad, a droplet out of the bezel that refracts content beneath it).
  - **Listening:** it pulses gently, with a waveform that follows the voice in real time.
  - **Thinking:** it shrinks into a loading indicator.
  - **Results:** it expands into a translucent overlay with app-native cards (a reminder, a photo grid, a note), not plain chat text.
  - The reviewer praised the fluidity. The speaking state isn't described.
- **For us:** shrink-to-spinner and expand-to-panel break our rule that the orb never changes shape. Keep the orb a sphere. Express thinking through glow and breathing, and let the answer panel grow from the orb's position instead.

## Apps to study

### 6. Bevel (AI health coach)
https://screensdesign.com/apps/bevel-health-performance/
Omar: the closest thing to Aven 2's idea. Study how coaching text and data live together, and daily guidance, then beat it.
- **Learned (screenshot catalogue):** every score is paired with one short line of guidance (recovery 81% plus what to train; nutrition 63 plus how to improve). The dashboard is built from customisable cards (add, reorder, pin). Food logging takes camera, barcode, photo or a typed meal description. There's a journal with mood, hydration and caffeine, and Strain, Recovery and Sleep detail pages. Many empty states come with troubleshooting banners.
- **Where we beat it:** the catalogue shows no conversational coach. Its coaching text is attached to scores, not to memory, goals or actions. Aven 2's coach remembers, acts with Undo and speaks first.

### 7. Tide Guide (2026 Apple Design Award, Visuals and Graphics)
Omar: study for progress, body-weight and health charts. (No link given; researched.)
- **Learned:** Apple praised the full-screen charts with custom animations and a sky palette that matches the real sky through the day. Glass is used as an accent inside the chart: a glass lens marks the value as you drag along the tide curve. Users can change chart timeline, order and height. Small glass buttons expand under the finger so it never hides them.
- **For us:** a weight or lift curve you scrub with your thumb, with the reading lifted above your finger.
- Sources: [Apple newsroom](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/), [Meet with Apple session](https://developer.apple.com/videos/play/meet-with-apple/257), [Nautik/Forbes](https://forbes.es/en/nautik-magazine/946677/this-is-the-tide-app-that-apple-just-awarded-a-prize-to/).

### 8. Moonlitt (2026 Apple Design Award, Interaction)
Omar: controls that need no explanation.
- **Learned:** the team's goal was that people "never feel the complexity": the astronomy runs under the hood while the surface stays quiet and "breathing". Coverage says they spent months tuning one time slider's feel, haptic ticks and smoothness (single source, treat with care).
- **For us:** one perfect scrubber beats ten controls.
- Sources: [Apple ADA Q&A](https://developer.apple.com/news/?id=v1nphz91), [gori.me](https://gori.me/en/apps/iphone-app-news/167222/).

### 9. (Not Boring) Camera (2026 ADA finalist, Visuals) and the Not Boring apps
Omar: tactile, physical materials that feel like real objects.
- **Learned:** you assemble your own camera from parts and colours in onboarding, which builds ownership. Filters change by twisting a clicky dial, and switches have real-time shadows, custom haptics and sounds. The main view stays minimal around the viewfinder. One review notes the dials can be slower than direct input.
- **For us:** physicality belongs in rare, emotional moments, never on the set-logging path where speed rules. The phone is Android Chrome, so haptics are limited to `navigator.vibrate` (no iOS-grade haptics).
- Sources: [Apple newsroom](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/), [screensdesign showcase](https://screensdesign.com/showcase/not-boring-camera), [TapSmart review](https://www.tapsmart.com/apps/not-boring-camera-review/?amp=1).

### 10. Gentler Streak
Omar: a kind but honest coaching tone.
- **Learned:** the core is the Activity Path, a moving band (not a fixed target) showing whether you're under, in or over your healthy range based on recent load. It replaces streak guilt with "ramp up or ease off". The tone is friendly and non-judgmental, carried by a mascot. Its weak points per one review: a crowded dashboard, and a countdown discount shown right after onboarding.
- **For us:** a band beats a single number. Copy its kindness but not its softness on repeated misses; Omar wants it harder when the same miss repeats.
- Sources: [screensdesign showcase](https://screensdesign.com/showcase/workout-tracker-gentler-streak), [BGR](https://bgr.com/tech/gentler-streak-gets-a-major-redesign-focused-on-your-wellbeing/).

### 11. Strong, Hevy and Gravl
Omar: benchmarks for set-logging speed and adaptive plans. Aven 2's logging must be at least as fast as Strong.
- **Learned:** Strong's speed comes from pre-filling last session's weight and reps, and starting the rest timer automatically when a set is ticked. Hevy is nearly as fast and free. Gravl auto-progresses from an estimated 1RM, stepping load up in real plate or machine increments. No source had measured timings.
- **For us:** measure taps and seconds per set in Aven and Strong-style flows, and set the target in PLAN.md.
- Sources: [repreturn](https://repreturn.com/?p=2544), [setgraph](https://setgraph.app/ai-blog/hevy-vs-strong), [sensai](https://www.sensai.fit/blog/gravl-app-review-2026).

## Libraries

### 12. Ripplix
https://ripplix.com, https://ripplix.com/onboarding
Omar: browse the categories for timers, toggles, selection, success states and charts.
- **Learned:** the home page lists the categories (Chart, Text Animation, Success State, Progress Bar, Onboarding, Opening, and the tags Toggle, Expand, Collapse, Swipe, Slider). The only example visible was a confetti success splash.
- **Couldn't open:** /onboarding is a login wall, and the actual clips need an account. Omar can bring screenshots.

### 13. LottieFiles
https://lottiefiles.com
Omar: only for celebration moments (new record, workout finished), never for UI chrome.
- **Learned:** 800k+ free and premium animations, as Lottie JSON or the smaller dotLottie, with official web players. The front page doesn't state the free licence terms, so check each animation's licence before use. A Lottie must be recoloured to our tokens and must not drop frames on the phone.

### 14. screensdesign.com
https://screensdesign.com
Omar: full flow recordings of top apps.
- **Learned:** recordings run from the first screen to after the purchase, for 2,800+ apps, tagged by chapter. There are categories such as "AI fitness coach apps" and an Animation Explorer. Showcase pages (Bevel, Gentler Streak, Not Boring Camera) are readable, but the full videos and Pro features need an account.

### 15. Mobbin and Dribbble
Need a login. Omar brings screenshots himself; they go into docs/inspiration/ with a line in notes.md.
