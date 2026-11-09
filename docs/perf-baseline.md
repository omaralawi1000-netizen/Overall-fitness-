# Phone speed baseline (provisional steps)

Goal: one honest set of numbers from Omar's phone, so the budget in `tests/e2e/perf-budget.json` and `docs/TASTE.md` §4c can be tightened from real data, not guesses. Nothing here changes the app.

## What Omar does (about 3 minutes, Chrome on the S26, battery saver off)
1. Open https://omaralawi1000-netizen.github.io/Overall-fitness-/blurtest/perf.html
2. Follow what the page says on screen and let it run to the end, with a finger on the screen when it asks.
3. Screenshot the result and send it in the project chat.

That page measures the glass the app uses (plain live blur), not the real screens.

## Next step (not built yet)
The real screens only exist as the Window prototype until PR #79 (`/app/`) is merged. After that, add a hidden `?perf` frame counter to the app (invisible unless the address has `?perf`), so the same baseline can be taken on Today, Train, Fuel and the workout. Until then the headless check covers structure only.

## What the numbers do
- The worst frame and the frame rate with blur on set the real `limit` and `goal` values. Write them into `perf-budget.json` and tell Omar what moved.
- If the phone shows no loss from today's blur count, the goal is relaxed (§4b already says live blur cost nothing in the test). If it shows loss, the budget is tightened and the new look changes before the budget does.
