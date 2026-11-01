# Blur test plan (Checkpoint 2, step 10)

The goal is to find the best-looking blur that stays smooth on Omar's phone, with zero banding (TASTE.md §3, points 1–3). Atmosphere is tested here as a material that could go on Living Notebook or Conversation Workspace. It is not tested as a structure.

## The scene (the same for every method)
- A long scrolling feed: colour photos, big numbers, 13 px text.
- A dark, slow full-screen gradient (the worst case for banding) and a bright, saturated one.
- A floating bottom bar and a progressive blur at the top edge.
- A sheet you can drag up, flick, and catch halfway on its way back.

## The methods, each labelled on screen
- **A. LIVE:** `backdrop-filter: blur() saturate()`. The browser blurs whatever is behind it.
- **B. LIVE + NOISE:** A, plus a fine still noise layer and a progressive edge (a mask on the blur layer). This is the zero-banding attempt. No primary source shows noise fixes banding on Android Chrome (tech scan, section A), so the phone decides.
- **C. BLURRED COPY (semi-live):** a second copy of the content inside the glass, with `filter: blur()`, kept in step with the scroll by script. It can lag by a frame.
- **D. PRE-BLURRED IMAGE (not live):** the background is blurred once and slides under the glass. It only works over a fixed background, never over scrolling content.
- **E. FAKE FROST (no blur):** tint, noise and an edge highlight. This is the cost baseline.
- **F (spare), only if A–D all band:** WebGL blur and dither of a background we draw ourselves. It is live, but only of our own background. liquidGL-style libraries are high risk (tech scan, section A).

## Comparing looks (all methods at once)
- **Split view:** the bar and the sheet are cut into strips, one method per strip, over the same pixels.
- **Flip view:** one method fills the screen. Tap A–E to flip instantly while scrolling and moving the sheet.

## Performance (one method at a time)
`perf.html?m=A`, and the same for B–E, loads only that method. A fixed 20-second run plays: a scroll fling, the sheet opening, a catch mid-way, then closing, scrolling with the sheet half open, and the sky moving. For each part it shows:
- average fps
- slow: the share of frames over 12.5 ms (a missed 120 Hz frame; 8.3 ms exactly would count normal jitter)
- hitches: frames over 21 ms (2.5 frames at 120 Hz), a visible stutter
- the longest frame
If most frames take about 16.7 ms it warns that either the screen ran at 60 Hz or the method is too heavy, and says to compare with E.

Then a "your turn" round. The meter only sees frames the page makes, so Omar's eye counts too.

## Facts to respect (tech scan, section A)
- Chrome 129 changed how backdrop-filter samples past its edges (mirror instead of duplicating edge pixels). Test on today's Chrome, not old notes.
- Live blur behind a View Transition snapshot freezes, and snapshots add layers mid-animation (black frames). Don't use View Transitions in the test.
- Interruptible motion: Motion 14's springs, or CSS `linear()` springs where nothing can catch them.

## On the phone
- Type `omaralawi1000-netizen.github.io/Overall-fitness-/blurtest/` in Chrome. Don't install it.
- Battery saver off, because it caps the screen at 60 Hz. Motion smoothness on Adaptive. Full brightness for banding.
- The page uses no storage at all, because it shares an origin with old Aven. A check fails the build if it ever does.
- Old Aven's service worker and Android app only cover `/The-new-Claude-gym-app/`.

## As built (1 Nov 2026)
- `site/blurtest/index.html` (compare), `perf.html` (speed test), shared `blur.js` and `blur.css`. No files to load: the sky and the three photos are drawn by the page.
- Opens in split view. The top edge, the bar and the sheet each have five strips, A to E left to right. Tap a letter for flip view (the address becomes `?m=B`, so a reload keeps it). Tapping the label in the bar goes back to split.
- Same tint and edge on every method; only the blur mechanism differs. E has a stronger tint because it has no blur.
- The sky is computed in full precision and dithered once. D's pre-blurred sky is exact (a blurred gaussian is a wider gaussian), so D can't band from its own picture.
- C's copy follows the scroll on the compositor (a scroll timeline), so it shouldn't trail on Chrome 115 or newer.
- The page scrolls inside a full-screen box, not the page itself, so Chrome's address bar stays put and nothing jumps.
- "Sky" makes the background drift slowly (the Atmosphere material test). The bar sits above the sheet, so Sheet and Sky are always reachable.
- The deploy fails if anything in `site/` touches browser storage (`.github/workflows/pages.yml`).

## Results on Omar's phone (1 Nov 2026, Chrome 156, 384×735 css, 3.75×)
Hands-off speed test, all methods:
- Every method ran at 60 fps, E (the no-blur baseline) included. So the screen was at 60 Hz during the hands-off run, most likely Samsung's adaptive refresh dropping to 60 when nothing touches the screen. The 120 Hz question is still open: it needs "Your turn" runs (finger on the screen).
- A, B, D, E: no hitches; worst frame 17–19 ms in every part.
- C: 4 hitches while the sheet moved (57 fps, worst 67 ms); everything else clean. C is the heaviest method, but this was one run.
- Still to come: which strip looks best, banding, and "Your turn" numbers.
