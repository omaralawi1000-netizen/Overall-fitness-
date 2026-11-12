# LESSONS from old Aven that still apply

Facts and taste learned the hard way (Oct 2026). Not old CSS rules: the new design solves these its own way.

## The phone (Galaxy S26 Ultra, Chrome, installed PWA, 120 Hz, 384 px, DPR 3.75)
1. Headless screenshots lie about blur and banding. Only the phone judges them: mark "needs phone", send to Beta.
2. Chrome on the phone draws gradients and blur output in whole 8-bit steps: big soft glows show rings. How to fix it
   is open: the blur test decides, and noise or dither is allowed.
3. Adding or dropping a compositor layer mid-animation gives black frames. Layers that move exist before the motion
   and stay after it. Entrance animations end on their neutral state, never on an explicit last keyframe.
4. Live blur on many cards measured about half the frame rate (36 fps on 20 Oct). Blur is a budget: count blurred
   layers per screen and measure on Beta. Where blur is part of the design, fix lag with a better blur method, not by removing it.
5. Animating `box-shadow`, `width`/`height`/`top`, or CSS variables on `<html>` restyles or repaints every frame.
   Transform and opacity are the cheap path; anything else is measured first.
6. On the phone, a script count-up runs at about 60 fps; browser-driven (WAAPI/CSS) animation reaches 120.
7. Too many full-screen layers starve the GPU and show blank patches. Release a leaving layer fast.
8. Tab switches drew only ~30 fps when leaving layers piled up. Interrupted transitions must not stack.
9. A tap must show on the very next frames (press dip at ~50 ms). Never wait on a timer before opening something.
10. Android Back must close the top sheet, and a closing sheet must be catchable and turn round mid-motion.
39. Screens behind the live workout never redraw on each tick of a timer; only the timer's own text changes (old `hooks.ts`, Omar 2 Nov).

## Voice, mic and speech
11. Bluetooth earbuds drop the mic into call mode and wreck audio: prefer the phone's own mic.
12. Whisper (Groq) is the best Danish/English hearing; it echoes its prompt on silence and invents subtitle lines
    ("Danske tekster", "Thanks for watching") in noise. Filter both; never send silence.
13. Whisper mishears Danish brands ("Cheasy" → "cheesy") without a list of names in its prompt.
14. On Auto language, mixed Danish/English is sometimes heard as Norwegian or Dutch: re-run as da and en, keep the best.
15. Hands-free always-on listening failed: it misheard Omar and reacted to him talking to others. Listen only after a tap.
16. The browser's own speech recognition is a weak fallback (needs network, no Danish nuance), but better than nothing.
17. Gemini TTS: play only the WAV data chunk (trailing metadata = loud burst), keep chunks short so speech starts fast.

## Food data
18. Open Food Facts covers Danish packaged food well enough; a bundled Danish list (3,660 products) makes search instant
    and offline. ODbL: credit it. USDA needs a server, which GitHub Pages doesn't have.
19. A missing nutrient is unknown, never zero. Show totals as "at least" when something is missing.
20. Portions: a typical portion is an estimate and says so. Dictated "one banana" is marked estimated.
21. AI food estimates (photo, text) are always shown as estimates for review, never logged as facts.
22. Big slips happen (a 4,170 kcal corn-cake portion): flag amounts far from the person's own usual.

## The Coach
23. The app computes, the model words it. Numbers in a reply come from code, never from the model's maths.
24. One shared fact summary feeds every surface, so Today, the chat and the review never disagree.
25. Every action is a card with its own Undo. Anything destructive is a preview first.
26. Safety limits live in code, not only in the prompt. No memory or preference unlocks a water cut, fasting or purging.
27. Mega-prompts patched round after round start contradicting themselves. Keep principles short; look the rest up.
28. The cheap model's variance is most of what's left: test with the model friends will really use.
29. "Never tell me to train lighter" was Omar's rule. For anyone else it's a preference the Coach learns.
38. Undo must not be tappable the moment an action is applied (old Aven's double-tap Apply bug). Omar, 1 Nov.

## Building the web app (3 Nov 2026, Today build)
39. First-tap stutter on desktop Chrome was GPU shader compilation (ANGLE), not JS. A glass layer whose scale the compositor animates, blurred text and 3D turns each compile on first use. Fix: a warm-up under the veil that plays every kind of motion once for real, not only static states.
40. A glass element that grows from scale(0) or animates width hitches. Grow glass with a clip on its own frost layer, or move it with translate only.
41. WAAPI commitStyles on interrupt leaves inline styles behind (it kept a record overlay stuck). Cancel instead, and always give explicit start keyframes.
42. A scrim with a higher z-index than a tray swallowed every tap inside the tray. Check stacking order whenever a scrim and a tray coexist.

## Old taste (history, not rules: Omar, 1 Nov)
Kept as background only. 35 (one tap ticks a set) and 36 (seamless settle) live on as tests in docs/TASTE.md.
30. Any warm or orange tint on a surface reads as orange. Colour goes on tappable or meaningful things only.
31. Grey, navy and brown "mud" glass: rejected. Opaque charcoal "clean look": "ruined".
32. Accent glow in a card corner reads as a stain. Accent-tinted glass reads brown.
33. Melting / cross-fade pop-up opens feel unnatural: a real frame that moves is wanted.
34. Collapsing large titles and title-font experiments: dropped. Camera drift on figures read as wobble.
35. Swipe to tick a set: removed for good. Tapping is the only way.
36. Seamless settle: the last moving frame and the first still frame are the same picture.
37. Fewer knobs. Eight palettes and nine backgrounds were too many to make perfect.

## Staying fast across many redesigns (research, 9 Nov 2026)
Why: old Aven got laggy as the look was changed round after round. Code structure was not the main cause: layers and
blur piled up, and old looks stayed in the code. Ranked, most important first. Sources are web posts and experience
reports, not studies; the numbers are examples, not promises for Omar's phone.
1. **Blur is a written budget, checked by a test.** Count `backdrop-filter` elements per screen (a number in
   DESIGN.md, e.g. 4 at most), none inside a scrolling list, none on hidden or opacity-0 things, one radius cap.
   A blurred element costs by the pixels behind it, so cost grows with scroll area, radius and count, none of which
   show in the CSS. One real case: 16 blurred elements gave 20 fps, 4 gave 60 fps, and the worst one was a stray
   background line. Sources: jaeyonging.com/en/blog/80, willchan.me/blog/css-for-systems-that-are-slow-to-paint,
   developer.chrome.com/blog/animated-blur.
2. **A script that runs on every PR and fails over budget.** Playwright plays the key moments (tab switch, open
   sheet, tick a set, rest timer), reads Long Animation Frames and the composited layer count, takes the median of 3
   runs, loose limits so it never flakes. Structure (layers, long frames) is the same headless as on the phone;
   absolute fps is not, so fps stays a phone test. Sources: css-animation.com "Enforcing Animation Performance
   Budgets in CI", github.com/css-scroll-driven/scroll-jank-profiler, MDN "Performance budgets".
3. **A new look is accepted only with phone numbers.** Beta fps on the S26 before and after, written in the PR. If
   the number drops, change the design, not the budget. Source: github.com/silverbucket/setlist-roller/issues/66.
4. **A redesign deletes the old look in the same PR.** CSS and components only grow unless pruning is a rule; dead
   styles cost parsing, conflicts and fear of touching anything. Sources: mdesignarad.com (weekly CSS delete),
   MDN performance budgets ("budgets stop slow creep").
5. **Taste lives in tokens plus rationale plus a "forbidden" list in DESIGN.md**, so a redesign changes tokens and
   rules, not every component. Every visual value traces to a token. Sources: teamit.fi (what makes a good
   Design.md), figma.com/resource-library/llm-context-design.
6. **One responsibility per file; a soft rule, not a line count.** Agents append to the file already open (a
   3,000-line component is typical; code volume predicted decay at rho 0.94 in one study). Split only with tests
   that freeze current behaviour first, one extraction per PR. Sources: mikful.com/writing/coding-agents-love-god-components,
   franciscopuga.es/blog/2026/04/23/managing-file-size-in-coding-agents, dev.to "Split a 3,200-line god class".
7. **Keep CLAUDE.md short** (about 100 lines): long rule files make the agent follow fewer rules. Move detail to
   docs read on demand. Sources: nizar.se/lean-claude-code-for-production, ksred.com Claude Code workflows.
8. Product side, lower priority: get real people on it early and don't polish before they've used it. Sources:
   indiehackers.com posts on shipping before polishing.

**Adopt now:** item 1 and 2 together as one small job: a `perf-budget` Playwright script plus the budget numbers in
a few lines of DESIGN.md, run on every PR. It's free (no paid APIs), works headless, and turns "keeps getting
laggy" into a red check before Omar sees a round. Needs a first measured baseline on his phone to set the numbers.

## Working on the Coach: mistakes and the rule from each (12 Nov 2026)
Omar, 12 Nov: "Every time you do things, learn from your mistakes." Read this before any Coach work; add to it when
something goes wrong. The plan these belong to: `docs/COACH.md` §8 "Cheap models first".
1. **Guessed the cause before reading the answers.** Two of the reset plan's three causes were wrong. Rule: read the
   saved answers first, and label a guess as a guess.
2. **Five rounds of rule patches, judged on 10 cases, gained nothing.** Rule: no prompt change without the yardstick,
   and one change per test.
3. **PR #100 changed a fact line and a rule's wording together,** so nobody knows which one worked, and it brought a
   two-question side effect. Rule: one change per test; rerun the slip checks after every fix.
4. **"Feels better" is not better.** WHOOP shipped a change that felt better and scored worse. Rule: never claim a
   gain without a run that shows it.
5. **Published a wrong total** ($4 where the steps added up to $5 to $6), and nearly blamed Opus for the Coach's own
   sum because the judge's notes print the two answers in shuffled order. Rule: recompute every sum before it goes
   out, and check in `answers.jsonl` who said what.
6. **Wrote the plan before looking outside.** The research then changed seven things. Rule: for a plan, research
   first.
7. **An Opus judge scoring Opus, and AI picks once labelled as Omar's.** Rule: always say who judged, and use two
   judge families or people at a gate.
8. **Two decision cards crossed** on the same question. Rule: one card per decision; settle it with the other thread
   first.
9. **The fact sheet called a stalled lift "up".** Labels steer the model more than rules do. Rule: test sheet labels
   and made-up case data like code, and remove a misleading row instead of telling the model to ignore it.
10. **The first gate-A bar ("+15 points") was set before the baseline was known** (the Coach already stood at 83 %).
    Rule: measure first, then set the bar.
11. Kept from before: a cheap round before any full run, and stop when the gain is marginal.
