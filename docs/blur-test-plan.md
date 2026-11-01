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
`perf.html?m=A`, and the same for B–E, loads only that method. A fixed 20-second run plays: a scroll fling, the sheet opening, a catch mid-way, then closing. It shows:
- average fps
- the share of frames slower than 8.3 ms
- the longest frame
- the number of frames slower than 16.7 ms

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
