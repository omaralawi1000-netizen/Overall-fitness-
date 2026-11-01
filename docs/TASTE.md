# TASTE: the tests the judges check

Omar's latest words win over this file, over older docs and over any skill (Omar, 1 Nov 2026). This file turns the "Design" and "Firm rules" parts of docs/BRIEF.md into checks a judge can run. If this file and BRIEF.md ever disagree, BRIEF.md wins and this file gets fixed.

**Blank page (Omar, 1 Nov).** Aven 2's design starts from zero. Old Aven is a reference for features, data and lessons only. No colour, colour ban, material, glass recipe, orb rule, layout, navigation, typography or motion restriction comes from it. `site/lab/`, `docs/inspiration/old-aven-review.md` and old Aven's style guide are history, not direction. Phone facts stay, as test cases.

Omar judges everything on his phone. Anything only the phone can show (blur, banding, smoothness at 120 Hz, touch feel) is marked **needs phone**, never passed or failed from headless screenshots.

## 1. The bar
- A top Apple designer finds nothing to wince at.
- Someone seeing it for the first time asks "what app is that?"
- Never generic or template-looking. Judged per screen, not by a list of banned colours.
- Every screen meets the full standard: settings, empty states, errors and rare flows included. Nothing gets a lesser version.
- No placeholders and no dead buttons. If it's in the UI, it works.

## 2. New, but obvious
- Every unusual idea passes the **5-second test**: a stranger understands the screen and the next action within 5 seconds.
- No gimmicks. Beautiful but confusing is a fail.
- Inspiration (docs/inspiration/) shows what Omar likes. Never copy a screen. If a reference can be beaten, beat it.

## 3. What Omar wants, in his words (1 Nov), checked on every screen
1. **The best-looking blur that stays smooth on his phone.** Where blur is part of the design, fix lag with a better blur method, not by removing it. → needs phone
2. **Zero banding.** Noise or dither is allowed when the blur test needs it. → needs phone
3. **See-through materials where they're beautiful.** Not everywhere by rule.
4. **Colours judged per screen** by whether they look beautiful and alive. No global colour bans.
5. **Big thumb targets.**
6. **Instant tap response:** a visible response on the very next frames.
7. **Calm but expressive motion that can be caught mid-gesture:** interruptible, velocity carried over, no restart from zero.

## 4. Motion tests
- One shared set of springs, defined in DESIGN.md once it exists. The springs themselves are new. New one-off timings are a defect unless DESIGN.md allows them.
- Off-screen animation is paused.
- Seamless settle: the last moving frame and the first still frame are the same picture.

## 5. Signature moments
These get the most care, and each has its own motion spec in DESIGN.md:
- the Coach listening and answering
- ticking a set
- the rest timer
- finishing a workout
- the Coach's reply arriving
- a new record
- opening the app in the morning

## 6. Gym reality
- Ticking a set takes exactly one tap. No swipe or long-press ticks a set (a test, Omar 1 Nov).
- Language: Danish and English for every string. Metric units, DKK, Danish foods first.

## 7. The phone: test cases (firm)
- Galaxy S26 Ultra, Chrome, installed as a PWA. 120 Hz, 384 css px wide, DPR 3.75. Judge layouts at 384 px wide.
- Target 120 fps. No flicker, no black frames, no layout jumps. Ever.
- Known problems, to be solved by design from day one (facts in docs/LESSONS.md 1–10), not patched later:
  - Soft gradients and blur show **banding** in its Chrome. → needs phone.
  - Adding or dropping layers mid-animation causes **black frames**. Layers that animate exist before the motion starts and stay until it ends.
  - Blur has a performance cost. Count blurred layers and measure them on the phone. → needs phone.
- The PWA must feel installed, never like a website (no tap flash, no text selection on buttons, no 100vh jump, no zoom on input focus, safe areas respected).

## 8. Data and keys (firm)
- Storage: every localStorage key and IndexedDB name starts with `a2` (Omar, 27 Oct; never `aven…`, because old Aven's "Delete everything" wipes every key starting with `aven`). Never write to Aven's keys or databases; they are only read, during the one-way import.
- Import from Aven is one-way and read-only: Aven's backup file, plus a one-tap "copy my Aven data in".
- Never commit real data: the repo is public. Tests use fake data built from Aven's backup format.
- API keys are typed into Settings and stay on the phone: never in code, commits, logs or backups. The Gemini key the environment injects as a header is only for tests and is never put in code, commits or logs.
- The app works without paid services; AI keys stay optional.

## 9. Build rules that affect what judges see
- Port the logic, rebuild the UI. Every screen, component and style is new. Old Aven's glow/dither code isn't ported; new noise or dither is fine when the blur test shows it's needed.
- Once DESIGN.md is approved, it changes only by proposal (reason, before/after, Omar's yes). A silent change to it is a defect.
- Playwright through the npm package in scripts, not the Playwright MCP.

## How a judge reports
- Score 1–10.
- Defects listed most serious first, each with: what is wrong, where (file:line or screenshot + timestamp), and the smallest fix.
- "needs phone" for anything in sections 3, 4 or 7 that only the real phone can show.
- Judges never edit files.
