# Aven 2

A from-scratch rebuild of my gym, food and wrestling app, Aven. This is not another fitness app. The goal is an app nobody has seen before: a real coach that understands me, remembers, helps and acts, with world-class design, motion and detail. Aim for the best you can do, not "good for a web app".

I'm Omar. I'm not a programmer, I dictate (expect misheard words), and I judge everything on my phone. Explain results in plain, short words.

## The reference
- Old app, read-only: https://github.com/omaralawi1000-netizen/The-new-Claude-gym-app. Clone it into ./reference/aven and add reference/ to .gitignore. Never commit, push or open PRs there. It stays live as my daily app until Aven 2 beats it.
- Read all of it before deciding anything: CLAUDE.md, docs/style-guide.md, docs/living-coach-plan.md, docs/coach-plan.md, docs/polish-plan.md, then every file in src/. README.md is 365 KB of design history: read the headings, and open any section whose lesson you need.
- Data model and import: src/lib/types.ts, persist.ts, backup.ts, beta.ts.
- Its scripts/ folder shows how to test, screenshot and film the app headless, and scripts/exam shows how its Coach was scored. Reuse those approaches.

## The product: a coach, not a logger
The Coach is the product. Everything else (workouts, food, health, progress) is how it sees me and how I act with it.
- Understands: anything I say or type, in Danish, English or a mix, by voice or text, from anywhere in the app. "200 g skyr and two eggs", "move pull day to Thursday", "I need 2 kg for wrestling by December, help me", "why am I so tired this week?"
- Remembers: goals, promises ("bed by 23:30"), preferences, injuries, patterns, what worked and what didn't. Memory is visible and editable: I can see what it knows and change or delete it. It never invents facts about me.
- Helps and acts: it changes my data, targets and plans directly, always with Undo. It never just gives advice text when it could do the thing.
- Tells the truth: real wins with the real numbers, misses said plainly, stalled lifts, protein, sleep, and whether I'm on pace for my goals. Every claim comes from my data.
- Speaks first when it matters, and stays silent otherwise. It picks its tone like a real coach: warm for a win, plain for a first miss, harder when the same miss repeats. Background coaching needs the Android side (see living-coach-plan step 3): design for it now, and say honestly what a PWA alone can and can't do.
- One fixed rule: it never helps with starving, skipping meals or water cuts.
- Port Aven's Coach brain, memory and living-coach work (steps 1–2 shipped) as the starting point, then make them much better. AI keys stay optional: the app must work without paid services.

## Design: world-class, and unmistakably its own
- The bar: a top Apple designer finds nothing to wince at, and someone seeing it for the first time asks "what app is that?" Premium and minimal, never generic "AI-looking".
- Research before designing. Study the apps and studios most praised right now for motion, depth and detail, from current sources. Note what makes them great and what nobody has done yet in fitness or coaching.
- Inspiration: docs/inspiration/ and notes.md hold what I like and what I never want. Study what makes each one work and use the principle, not the look. Never copy a screen. If you can beat a reference, beat it. Use them in your research and when building the Checkpoint 2 directions, and tell me which reference shaped which choice.
- New must still be obvious. Every unusual idea passes a 5-second test: a stranger understands the screen and the next action. No gimmicks. Beautiful but confusing is a fail.
- My taste:
  - Frosted glass with real depth.
  - Calm iOS-style motion: critically damped springs that ease out, no overshoot. A little bounce only after a flick or throw.
  - Accent colour only on things you tap or that mean something.
  - No orange or warm tint on surfaces, and no grey, navy or brown mud.
  - Floating things (bars, sheets, the rest timer) are see-through frost, never a solid block.
  - Anything moving can be caught and turned around mid-motion.
  - Fewer knobs, done perfectly. Aven grew 8 palettes, per-tab hues and many backgrounds; find the few that matter.
- Signature moments get the most care, each with its own motion spec:
  - the voice orb listening and answering
  - ticking a set
  - the rest timer
  - finishing a workout
  - the Coach's reply arriving
  - a new record
  - opening the app in the morning
- Every screen, including settings and rare flows, meets the full DESIGN.md standard. Nothing gets a lesser version.
- The orb never changes shape: it moves, glows, breathes and reacts to my voice.
- Gym reality: big targets near the thumb, for sweaty hands. Tapping is the only way to tick a set. Every tap shows a response on the very next frames.
- Danish and English for every string. Metric units, DKK, Danish foods first.
- No placeholders or dead buttons. If it's in the UI, it works.

## Firm rules
- My phone: Galaxy S26 Ultra, Chrome, installed as a PWA, 120 Hz, 384 css px wide, DPR 3.75. Target 120 fps. No flicker, black frames or layout jumps, ever.
- Design around the phone's known problems from day one (Aven style guide sections 1 and 5). Soft gradients and blur show banding in its Chrome. Adding or dropping layers mid-animation causes black frames. Blur has a performance cost. Solve these by design, not with patches later.
- Headless Chromium doesn't show blur and banding the way my phone does. Only my phone judges those, so label them "needs phone" and send them to Beta.
- My data is precious. Aven 2 runs on the same github.io origin as Aven, so give it its own storage namespace: prefix every localStorage key and IndexedDB name with `a2` (decided 27 Oct: not `aven2`, because Aven's "Delete everything" wipes every key starting with `aven`). Never write to Aven's keys or databases.
- Bring my data over with a one-way, read-only import: Aven's backup file, plus a one-tap "copy my Aven data in" like Aven Beta has. Build the import test from Aven's backup format in the code. Never commit my real data: this repo is public.
- API keys are typed into Settings and stay on the phone: never in code, commits, logs or backups.
- For the Coach exam, a free Gemini key is injected automatically as the `x-goog-api-key` header on requests to generativelanguage.googleapis.com. There is no GEMINI_API_KEY variable: send Gemini requests without a key and the environment adds it. Use it only for tests. Never put a key in code, commits or logs. It is the free tier, which has rate limits: pace the Coach exam calls and retry on rate-limit errors (HTTP 429) with a wait. Use gemini-3.8-flash (gemini-2.5-flash is closed to new users). My own key, used on my phone and by friends at the start, has billing, so the free-tier limit only slows the exam, not daily use.
- Stack. Default: React + TypeScript + Vite PWA on GitHub Pages, plus Aven's Android wrapper for background coaching and notifications. This keeps the loop where you can see and judge every screen with Playwright. If you find a concrete, measured reason that another stack gives clearly better motion or coaching, make the case at checkpoint 1 with evidence and one recommendation.
- Port the logic, rebuild the UI. Copy domain logic that is clean and tested, together with its tests: the data model, parsers, nutrition maths, food and exercise data, AI clients and the Coach brain. Rewrite whatever is tangled. Build every screen, component and style from zero. Don't bring over the glow/dither machinery unless you prove the new design needs it.
- Playwright: use the npm package through scripts, like Aven does. Don't depend on the Playwright MCP, which may not load in cloud sessions.
- Once DESIGN.md is approved, changes to it come as a proposal with the reason, a before/after, and my yes. Improving it is always welcome; changing it silently is not.
- Batch your questions: at most one message of questions per phase, unless something blocks you.

## Skills and judges (in .claude/skills and .claude/agents)
- frontend-design and emil-design-eng: taste for every screen. Spend boldness in one place, and keep everything around it quiet.
- apple-design: the default for all motion, materials, sheets and gestures.
- animation-performance: check every animation against the 120 fps budget and the cost of blur.
- mobile-native: the PWA must feel installed, never like a website.
- prototype and review-animations only run when invoked by name, so read their SKILL.md files (and PICKER.md / STANDARDS.md) and follow them directly. prototype is for every design exploration; review-animations is the motion-judge's rulebook.
- verification-before-completion: before saying anything is done.
- Judges: design-judge, motion-judge, coach-judge. Use fresh ones each round, and iterate until they stop finding real defects. I only see work that already passed.
- If a skill and docs/TASTE.md disagree, TASTE.md wins.

## Phase 0: vision and design (no app code)
Take as many sessions as it needs. End every session by updating docs/PROGRESS.md with what's done and the exact next step.

### Checkpoint 1: what we're building
1. Interview me first: one question at a time, at most ~12, each answerable in one spoken sentence. Cover my days, training, wrestling, food, school, work, and what a perfect coach would do for me. (I may type /grill-me instead.)
2. VISION.md: what makes Aven 2 unlike any fitness app, in plain words. Include a day with it, written as the actual moments (morning, mid-workout, after training, logging food, a bad night, a stalled lift, a goal reached), plus the 3–5 principles every decision follows.
3. COACH.md: how the Coach works.
   - Memory model: what it stores, how it's shown to me, how I edit it.
   - How it builds context from my data.
   - Its actions and Undo.
   - When and how it speaks first.
   - Its voice and tone.
   - The exam: realistic conversations from my real situations, scored by fresh coach-judges, with a target score and before/after scores against Aven's current Coach.
4. INVENTORY.md: every feature in Aven, grouped by area (Today, workout, train/library, food, Coach/voice, progress/health, settings/data, Android/PWA). Walk every file in src/screens and src/lib so nothing is missed. For each feature: one line on what it does, plus keep / merge / cut / later, with a one-line reason. Nothing gets dropped silently.
5. LESSONS.md, max ~40 lines: the hard-won lessons from Aven that still apply (the phone, blur, banding, mic, speech-to-text, food APIs, my rejected looks). Write them as facts and taste, not old CSS rules.
6. Stop and send me one message with: the vision in a few lines, the stack recommendation, the cuts and merges that need my yes, and the decisions only I can make. Wait for my go.

### Checkpoint 2: how it looks and moves
7. First set up the GitHub Pages deploy workflow. If it needs a click from me, tell me exactly what to click.
8. Build at least 4 genuinely different directions, each on a named axis. At least 2 must be bold: a new way to interact or a new way to see my training that no fitness app has, not a reskin. All of them still pass the 5-second test. Each direction shows:
   - the same key screens: Today, a live workout mid-set with the rest timer, the Coach with the orb and memory
   - at least 2 signature moments in motion
   Use the prototype skill's divergence rules, craft bar and picker. Where it says "one piece per run", treat each direction's set of key screens as the piece, and run it separately for each signature moment.
9. Deploy the picker to GitHub Pages under /lab/, with its own storage prefix, so I can flip through the directions on my own phone. Also film each direction at real speed and half speed (384×832, dark theme) and put the clips on the lab page.
10. Judge with fresh design-judges and motion-judges, and iterate until they stop finding real defects. Then show me your pick first, with your main reason and the main trade-off, and the runners-up after it.
11. After my yes, write DESIGN.md: the chosen direction as rules.
    - colour and type tokens, spacing, radii, glass, depth
    - one shared set of springs
    - the orb
    - navigation
    - a motion spec for every signature moment
    Delete the losing prototypes.
12. Write PLAN.md: phases, one per session, each ending in something I can actually use.
    - Core loop first: live workout, Today and the Coach's foundation. Normal logging (sets like "8 at 80", common foods, water, weight) works instantly without the AI and offline; the AI is for real coaching.
    - A manual backup (save a file to the phone, restore from it) ships in the first build phase. Google Drive backup can wait.
    - The watch and Health Connect (the Android wrapper) come right after the core loop, not at the end.
    - Then food, voice, then the rest.
    - Last phase: a parity check against INVENTORY.md and the Coach exam. After that, I use both apps side by side for a week before Aven 2 replaces Aven.
13. Set up a Beta channel like Aven's.

## Every build session
- I'll say "do phase N". Do that phase fully and to the DESIGN.md standard, then tick it off in PLAN.md and update PROGRESS.md.
- Test thoroughly: typecheck, tests, build, the user journeys the phase touches, and films for anything that moves. Run the judges before showing me anything visual. Run the Coach exam whenever the Coach changes, with before/after scores.
- Anything that only my phone can judge (smoothness, banding, blur, touch feel) goes to Beta first, with exactly what to check. Everything else ships after my yes on the clip.
- To ship: bump the version, open a PR into main, merge it yourself, and confirm the deploy is green. Then tell me exactly what to check on my phone and to fully reload the app.
- Work on your own without asking me to approve commands. Stop only for a clearly better idea, a real risk, or anything that touches my data.
- Never say done, fixed or tested unless you actually ran it. Say what you couldn't verify, especially anything only my phone can show.
