# Porting Window into the app

Window is the spine (Omar, 3 Nov 2026). It was designed as a single-file artifact (v17, https://claude.ai/artifact/2mGPer97P43dNo4Y5Ugjhp; source zip `aven-window-v17-src.zip` in the shared folder) and now lives in the repo as the app. This file says where everything went and keeps the rules the build must hold.

## Where things are
- `src/app/index.html`: the markup of every screen. `src/app/app.css`: all styles, with the self-hosted `@font-face` rules on top.
- `src/app/main.js`: the app (one ES module: sky, Today, Train, Fuel, Health, Coach, Settings, the workout, the warm-up). It runs on example numbers for the plan, sleep and weight; workouts and foods are saved through the engine (`store.ts`).
- `src/app/store.ts`: the screen's workout and food, mirrored into engine records (tests: `tests/app/store.test.ts`).
- `src/app/stage.js`: the 3D equipment behind the workout (three.js). A dynamic `import()`, so three.js is its own file, fetched and built only after Today has settled.
- `src/app/public/`: files served as they are: `photo.jpg` + `mask.png` (the picture), `hero/` (Train explainer stills; the Blender clay clips take their place when Omar's zips arrive), `thumbs/` (Train list pictures), `fonts/` (Geist and Instrument Serif, Latin only, SIL OFL), `manifest.webmanifest`, icons, `sw.js`.
- Build: `npm run build` makes the engine page (`dist/engine/`) and the app (`dist/app/`). Dev: `npm run dev:app`. Config: `vite.app.config.ts` (relative base, so it works at `/app/` on Pages and at the root in dev).
- Checks: `npm run build && npm run test:app` (`tests/e2e/app.mjs`, real Chromium on made-up data; the picture is compared with `tests/e2e/fixtures/app-sky-ref.json`).
- The artifact build's other tools (frame timing `perf.mjs`, screenshot driver, photo cutter `process.mjs`) stay in the zip; port one when needed.
- Live: https://omaralawi1000-netizen.github.io/Overall-fitness-/app/ (installable; Chrome offers "Install app").

## What changed from the artifact
- Type is self-hosted and preloaded (no Google Fonts), `font-display: block`, so there is no fallback flash.
- Cold start: the still copy of Today's first screen (the numbers) is painted as soon as Today is built; the other four screens, the photo, the GL and the warm-up come after, under it. `window.__numbersAt` and `window.__ready` mark the two moments.
- three.js comes from npm (`three@0.170.0`) instead of a 770 KB prebuilt script.
- A small service worker (`public/sw.js`, cache `a2-app-*`) saves the app so it opens offline. It never reloads a page.
- No person is built in. The greeting uses the name in `a2:name` (set by onboarding) or none. Health, sleep and food numbers are still examples.
- Photo credit stays in Settings. Aven's own image is still to do (Omar's point 6).

## Rules this build keeps (keep them in the port)
- **One spring for all motion.** It is k 380 and c 32, compiled to CSS `linear()` and stored in `--se` and `--sd`. Every interrupted animation is replaced, never committed.
- **Glass is frosted from the first frame.** Nothing fades, clips, filters or masks an ancestor of a `backdrop-filter`. Sheets grow by clipping their own `::before`, and content fades separately.
- **Warm-up under the veil.** Every screen, sheet and in-between state is drawn once, and every kind of motion is played once. The GPU compiles a shader the first time it meets a new kind of layer, and that compile is what made first taps stutter.
- **Haptics only where there is a motor** (`pointer: coarse`), and they can be switched off in Settings.
- **Rain is drawn once** into two small tiles. The tiles fall on the compositor, behind the glass, only on Today while it rains, and stop during the workout.
- **Screen cards rise in by CSS transitions** (`.scr.in`, delay `--d`), not by script animations that are cancelled at the end. Cancelled fades left whole cards blank on the compositor in Chrome, even though the page reported them at opacity 1. A group that holds glass only moves and never fades.
- **A screen is pre-drawn while the finger is down** (`prewarm`, at opacity .004), and the new screen starts one frame after the tap, so the tap's own frame stays light.
- **The dial only counts time.** Food and readiness are said in words beside it. Readiness is a lockup: the score, then the word.
- **Storage keys use the `a2:` prefix.** There is no API key in the code. Health, sleep and food numbers are examples.

## Fixed on 3 Nov (Codex review of the repo port)
1. Two taps on Log inside the 300 ms hand-off logged the set twice and skipped one. There is now a synchronous `W.busy` guard.
2. "Use 85 kg" after the 30-minute plan trimmed the workout to 3 sets read a 4th set and threw an error. It now changes only the sets that exist, and Undo restores them.
3. A rest that ended while the workout was minimised forced the view back to the workout. Now the rest ends quietly and a toast says so. A rest that ends under the record medal hands over to the next set when the medal lands.
4. Rebuilding Fuel or Coach after a language change added a second click handler, so one quick add logged twice. The handlers are now registered once, outside the builders.

## Fixed on 3 Nov (Codex review of v6), each with a check in `tests/e2e/app.mjs`
5. The 30-minute plan accepted during a workout now trims the live workout too (`trimLive`). It keeps every logged set and its place on the strip. If the workout is already past the cut, it says so and stays whole.
6. After the last set, Log becomes "Finish Push" and opens the whole-workout sheet. It can never log the set again, and a finished lift can't be re-entered from the sheet.
7. Food is counted the moment you tap and gets an id. Only the picture waits for the flying amount, so Undo removes exactly that entry (quick add, keypad, Coach proposal).
8. Steppers close on minimise, and their buttons do nothing outside the set view.

## Picture checks (also in `tests/e2e/app.mjs`)
An inline `//` comment twice swallowed code on the same line: once the playhead, once six shader uniforms, which meant no fog, rain, cloud, night or moon. The checks now:
- `__aven.uniformsUnset()` lists any declared uniform that a frame leaves unset. It must be empty.
- `__aven.sky(minute, weather)` returns a 43×93 grid of the picture plus a count of bright pixels in the top of the sky. The checks require fog, rain and cloud to change the noon picture, and a clear night to be dark with stars.
- Each state is diffed against `tests/e2e/fixtures/app-sky-ref.json`, a known-good reference. To refresh it on purpose, set `NEWREF=1`.

## The day dial
Today's dial is a low, wide ellipse: the sun's path (`SX`/`SY` in `pt()`), not a ring. "Now" is a playhead across the path, because the real sun is in the photo. The photo's sun dims where it would sit on words (`sunNearText`).
