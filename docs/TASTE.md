# TASTE: the rulebook for the judges

This is the "Design" and "Firm rules" part of docs/BRIEF.md, written as rules a judge can check. If a skill and this file disagree, this file wins. If this file and BRIEF.md ever disagree, BRIEF.md wins and this file gets fixed.

Omar judges everything on his phone. Anything only the phone can show (blur, banding, smoothness at 120 Hz, touch feel) is marked **needs phone**, never passed or failed from headless screenshots.

## 1. The bar
- A top Apple designer finds nothing to wince at.
- Someone seeing it for the first time asks "what app is that?"
- Premium and minimal. Never generic or "AI-looking" (no default gradients, stock glow, purple-on-dark templates, emoji-as-design).
- Every screen meets the full standard: settings, empty states, errors and rare flows included. Nothing gets a lesser version.
- No placeholders and no dead buttons. If it's in the UI, it works.

## 2. New, but obvious
- Every unusual idea passes the **5-second test**: a stranger understands the screen and the next action within 5 seconds.
- No gimmicks. Beautiful but confusing is a fail.
- Inspiration (docs/inspiration/notes.md) is used for its principle, never its look. Never copy a screen. If a reference can be beaten, beat it.
- Spend boldness in one place per screen; keep everything around it quiet.

## 3. Colour and material
- Frosted glass with real depth: layers you can read as near and far.
- Floating things (bars, sheets, the rest timer, buttons over content) are see-through frost, never a solid block.
- Accent colour only on things you tap or that mean something. Decoration doesn't get the accent.
- No orange or warm tint on surfaces. No grey, navy or brown "mud".
- Fewer knobs, done perfectly. Aven grew 8 palettes, per-tab hues and many backgrounds; Aven 2 keeps only the few that matter.

## 4. Motion
- Calm iOS-style motion: critically damped springs that ease out, **no overshoot**.
- A little bounce only after a flick or throw (a gesture with real velocity).
- Anything moving can be caught and turned around mid-motion (interruptible, velocity carried over, no restart from zero).
- Every tap shows a response on the very next frames.
- One shared set of springs (defined in DESIGN.md once it exists). New one-off timings are a defect unless DESIGN.md allows them.
- Off-screen animation is paused.

## 5. The orb
- The orb never changes shape. It moves, glows, breathes and reacts to Omar's voice. Squash, morph or shape change is a defect.

## 6. Signature moments
These get the most care, and each has its own motion spec in DESIGN.md:
- the voice orb listening and answering
- ticking a set
- the rest timer
- finishing a workout
- the Coach's reply arriving
- a new record
- opening the app in the morning

## 7. Gym reality
- Big targets near the thumb, for sweaty hands.
- Tapping is the only way to tick a set (no swipe-to-tick, no long-press-to-tick).
- Language: Danish and English for every string. Metric units, DKK, Danish foods first.

## 8. The phone (firm)
- Galaxy S26 Ultra, Chrome, installed as a PWA. 120 Hz, 384 css px wide, DPR 3.75. Judge layouts at 384 px wide.
- Target 120 fps. No flicker, no black frames, no layout jumps. Ever.
- Known problems, to be solved by design from day one (Aven style guide sections 1 and 5), not patched later:
  - Soft gradients and blur show **banding** in its Chrome. → needs phone.
  - Adding or dropping layers mid-animation causes **black frames**. Layers that animate exist before the motion starts and stay until it ends.
  - Blur has a performance cost. Count blurred layers; animated blur must be justified and measured. → needs phone.
- The PWA must feel installed, never like a website (no tap flash, no text selection on buttons, no 100vh jump, no zoom on input focus, safe areas respected).

## 9. Data and keys (firm)
- Storage: every localStorage key and IndexedDB name starts with `aven2`. Never write to Aven's keys or databases; they are only read, during the one-way import.
- Import from Aven is one-way and read-only: Aven's backup file, plus a one-tap "copy my Aven data in".
- Never commit real data: the repo is public. Tests use fake data built from Aven's backup format.
- API keys are typed into Settings and stay on the phone: never in code, commits, logs or backups. The Gemini key the environment injects as a header is only for tests and is never put in code, commits or logs.
- The app works without paid services; AI keys stay optional.

## 10. Build rules that affect what judges see
- Port the logic, rebuild the UI. Every screen, component and style is new. Aven's glow/dither machinery stays out unless proven necessary.
- Once DESIGN.md is approved, it changes only by proposal (reason, before/after, Omar's yes). A silent change to it is a defect.
- Playwright through the npm package in scripts, not the Playwright MCP.

## How a judge reports
- Score 1–10.
- Defects listed most serious first, each with: what is wrong, where (file:line or screenshot + timestamp), and the smallest fix.
- "needs phone" for anything in sections 3, 4 or 8 that only the real phone can show.
- Judges never edit files.
