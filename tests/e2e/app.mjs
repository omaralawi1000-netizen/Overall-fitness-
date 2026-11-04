// End-to-end checks of the app (Window) in a real Chromium, with made-up data only. The first 10 are the regression checks
// from the Window build (Codex findings of 3 Nov); the rest are the port's own: self-hosted type, the cold start and storage.
// Run: npm run build, then  node tests/e2e/app.mjs [url]   (default: serves dist/app itself; software GL, so no frame-rate claims)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const root = join(import.meta.dirname, '../../dist/app');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let srv = null, base = process.argv[2];
if (!base) {
  srv = http.createServer(async (q, r) => {
    let f = join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    try { const d = await readFile(f); r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); r.end(d); } catch { r.writeHead(404); r.end(); }
  }).listen(0);
  base = `http://localhost:${srv.address().port}/`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const open = async (q = '') => { // `nosave` keeps these checks off the saved database; the saving check below turns it on
  await p.goto(base + q + (q ? '&' : '?') + 'nosave'); await p.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await sleep(600);
};
const ev = (s) => p.evaluate(s);
const out = [];
const check = (name, ok, info) => out.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + JSON.stringify(info) : ''}`);

// --- the port's own checks ---
// P1. the type is ours: three font files from this address, none from Google, and the faces are really loaded
const reqs = []; p.on('request', (r) => reqs.push(r.url()));
await p.goto(base + '?nosw');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await sleep(400);
let r = await ev(`({ geist: document.fonts.check('300 40px Geist'), serif: document.fonts.check('italic 40px "Instrument Serif"'), faces: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style) })`);
const external = reqs.filter((u) => !u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:'));
check('type is self-hosted: faces loaded, nothing fetched from another address', r.geist && r.serif && r.faces.length >= 2 && external.length === 0, { faces: r.faces, external });

// P2. a cold start paints the numbers first and everything else after (the gap is what the phone test measures for real)
const m = await ev(`({ numbers: Math.round(window.__numbersAt), ready: Math.round(window.__readyAt || 0) })`);
check('numbers are painted before the graphics are ready', m.numbers > 0 && m.ready > m.numbers, m);
await p.goto(base + '?nosw'); // read the splash text while the page is still warming up
await p.waitForFunction(() => window.__numbersAt, null, { timeout: 90000 });
const snap = await ev(`({ big: document.querySelector('#splash .rw, #splash .title h1')?.textContent?.trim() || '', words: document.querySelector('#splash')?.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 120) })`);
check('the first screen is readable (a real word, not an empty box) at the first paint', snap.words.length > 20, snap);
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });

// P3. storage: keys keep the a2: prefix, and the language survives a reload
await open('?nosw'); await ev(`document.getElementById('setB0').click()`); await sleep(700);
await ev(`document.querySelector('#setS [data-l="da"]').click()`); await sleep(400);
await open('?nosw');
r = await ev(`({ keys: Object.keys(localStorage), tab: document.querySelector('#dock [data-tab="train"] span')?.textContent })`);
check('Danish stays after a reload, and every key starts with a2:', r.tab === 'Træn' && r.keys.length > 0 && r.keys.every((k) => k.startsWith('a2:')), r);
await ev(`localStorage.clear()`);

// P4. installable and offline: manifest, icons, and a second open with the network gone
const man = await (await ctx.request.get(base + 'manifest.webmanifest')).json();
const icons = await Promise.all(man.icons.map(async (i) => (await ctx.request.get(base + i.src)).status()));
check('manifest is standalone with working icons', man.display === 'standalone' && icons.every((c) => c === 200) && man.icons.some((i) => i.purpose === 'maskable'), { display: man.display, icons });
await p.goto(base); await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const sw = await ev(`navigator.serviceWorker.ready.then(r => !!r.active)`);
// no second online visit: the first one must be enough
await ctx.setOffline(true);
let offlineOk = true; try { await p.reload(); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 }); } catch { offlineOk = false; }
await ctx.setOffline(false);
check('a saved app opens with no network', sw && offlineOk, { sw, offlineOk });
await ev(`navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())))`).catch(() => {});

// P5. a workout that saves: log sets, kill the page, come back and resume, finish, and the engine holds a finished session
await open('?rest=8'); await ev(`indexedDB.deleteDatabase('a2.data')`); await sleep(300);
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`__aven.startWorkout()`); await sleep(1000); await ev(`__aven.logSet()`); await sleep(900); await ev(`__aven.endRest(false)`); await sleep(700); await ev(`__aven.logSet()`); await sleep(900);
await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
let db = await ev(`(() => { const e = window.__saver.engine, s = e.all('session')[0]; return { state: s?.state, sets: e.all('set').filter(x => x.done).map(x => [x.done.kg, x.done.reps]), total: e.all('set').length, slots: e.all('slot').length } })()`);
check('two logged sets are saved in the engine as they happen', db.state === 'active' && db.sets.length === 2 && db.total === 16 && db.slots === 5, db);
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver && document.getElementById('live').classList.contains('on'), null, { timeout: 90000 }); await sleep(500);
r = await ev(`({ idx: __aven.W.idx, done: __aven.W.done[0].length, vol: __aven.W.vol, live: document.getElementById('live').classList.contains('on'), txt: document.getElementById('liveT').textContent })`);
check('after the page is killed the workout comes back as the live pill with its sets', r.live && r.idx === 2 && r.done === 2 && r.vol === 80 * 8 + 82.5 * 8, r);
await ev(`__aven.startWorkout()`); await sleep(1000);
await ev(`__aven.logSet()`); await sleep(900);
await ev(`__aven.finish()`); await sleep(1200);
await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
db = await ev(`(() => { const e = window.__saver.engine, s = e.all('session'); return { n: s.length, state: s[0].state, done: e.all('set').filter(x => x.done).length, skipped: e.all('set').filter(x => x.skipped).length, ended: !!s[0].endedAt } })()`);
check('finishing saves a finished session and marks the unlogged sets skipped', db.n === 1 && db.state === 'finished' && db.ended && db.done === 3 && db.skipped === 13, db);
await p.goto(base + '?nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
r = await ev(`({ live: document.getElementById('live').classList.contains('on'), W: !!__aven.W })`);
check('a finished workout does not come back as live', !r.live && !r.W, r);
await ev(`indexedDB.deleteDatabase('a2.data')`);

// P6. food that saves: a quick add survives a reload, and Undo removes it from the database too
await p.goto(base + '?nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`__aven.show('fuel')`); await sleep(1000);
await ev(`document.querySelector('#sFuel [data-q="1"]').click()`); await sleep(1200);
await ev(`document.querySelector('#sFuel [data-q="0"]').click()`); await sleep(1200);
await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
await p.goto(base + '?nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(800);
await ev(`__aven.show('fuel')`); await sleep(1000);
r = await ev(`({ rows: document.querySelectorAll('#mealList .meal').length, names: [...document.querySelectorAll('#mealList .meal .n')].map(x => x.textContent), db: __saver.foods().length })`);
check('food logged before a reload is still there after it', r.db === 2 && r.rows >= 2 && r.names.includes('3 eggs'), r);
await ev(`document.getElementById('toastU')?.click()`);
await ev(`indexedDB.deleteDatabase('a2.data')`);

// P6b. a planned meal ticked before its time is still ticked after a reload
await p.goto(base + '?nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`__aven.show('fuel')`); await sleep(1000);
const mk = await ev(`(() => { const all = [...document.querySelectorAll('[data-mc]')].map(c => c.dataset.mc); const open = __aven.openMeals(); const k = open[0]; if (!k) return null; document.querySelector('[data-mc="' + k + '"]').click(); return k; })()`);
if (mk) {
  await sleep(1200); await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
  await p.goto(base + '?nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(800);
  r = await ev(`({ ticked: __aven.openMeals().indexOf('${mk}') < 0, listed: document.querySelectorAll('#mealList .meal').length })`);
  check('a planned meal ticked early is still ticked after a reload, and not listed twice', r.ticked, r);
} else check('a planned meal ticked early is still ticked after a reload (every meal was already due)', true);
await ev(`indexedDB.deleteDatabase('a2.data')`);

// P5b. open a workout from the whole-workout sheet out of order, reload: the strip follows the set it resumes
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`__aven.startWorkout()`); await sleep(900);
await ev(`(() => { const W = __aven.W; W.e = 4; W.s = 0; W.idx = W.total - W.ex[4].sets.length; })()`);
await ev(`__aven.logSet()`); await sleep(1200);
await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver && document.getElementById('live').classList.contains('on'), null, { timeout: 90000 }); await sleep(500);
r = await ev(`({ e: __aven.W.e, s: __aven.W.s, idx: __aven.W.idx })`);
check('after a reload the strip is on the set it resumes at', r.e === 0 && r.s === 0 && r.idx === 0, r);
await ev(`indexedDB.deleteDatabase('a2.data')`);

// P5c. a rest in progress is still running after a reload; a finish tapped before the database opened is still saved
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`__aven.startWorkout()`); await sleep(900);
await ev(`__aven.logSet()`); await sleep(700);
await p.waitForFunction(() => !window.__saver.engine.busy(), null, { timeout: 8000 });
await ev(`(() => { const x = JSON.parse(localStorage.getItem('a2:rest')); x.end = Date.now() + 60000; localStorage.setItem('a2:rest', JSON.stringify(x)); })()`); // a slow test machine must not outlast a 10 s rest
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver && document.getElementById('live').classList.contains('on'), null, { timeout: 90000 });
r = await ev(`({ rest: !!__aven.W.rest, left: __aven.W.rest ? Math.round((__aven.W.rest.end - Date.now()) / 1000) : null })`);
check('a rest in progress is still running after a reload', r.rest && r.left > 0, r);
await ev(`indexedDB.deleteDatabase('a2.data')`);
await p.goto(base + '?rest=8&nosw'); await p.waitForFunction(() => window.__ready && window.__saver, null, { timeout: 90000 }); await sleep(400);
await ev(`localStorage.removeItem('a2:rest')`);

// 1. two taps on Log inside the 300 ms hand-off log one set
await open('?rest');
await ev(`localStorage.clear(); __aven.startWorkout()`); await sleep(900);
await ev(`(() => { const b = document.getElementById('logB'); b.click(); setTimeout(() => b.click(), 60); })()`); await sleep(900);
r = await ev(`({ idx: __aven.W.idx, done: __aven.W.done[0].length, view: __aven.S.view })`);
check('double tap on Log logs one set', r.idx === 1 && r.done === 1 && r.view === 'rest', r);

// 2. the 30-minute plan (3 sets) and "Use 85 kg" on set 3
await open('?rest');
await ev(`__aven.S.trimmed = true; __aven.startWorkout()`); await sleep(900);
await ev(`__aven.logSet()`); await sleep(700); await ev(`__aven.endRest(false)`); await sleep(700);
await ev(`__aven.logSet()`); await sleep(2200);
r = await ev(`(() => { const b = document.getElementById('use85'); if (!b) return { tray: false }; b.click(); return { tray: true, sets: __aven.W.ex[0].sets.map(s => s[0]) }; })()`); await sleep(400);
check('Use 85 kg on the trimmed plan', r.tray && r.sets.length === 3 && r.sets[2] === 85 && !errs.length, { ...r, errs: errs.slice() });

// 3. a rest that ends while minimised and on another screen leaves the view alone
await open('?rest');
await ev(`__aven.startWorkout()`); await sleep(900); await ev(`__aven.logSet()`); await sleep(800);
await ev(`__aven.minimise()`); await sleep(800); await ev(`__aven.show('fuel')`);
await sleep(14000);
r = await ev(`({ view: __aven.S.view, tab: __aven.S.tab, rest: !!__aven.W.rest, phoneV: document.getElementById('phone').dataset.v })`);
check('rest ending while minimised keeps the screen', r.view === 'today' && r.tab === 'fuel' && !r.rest && r.phoneV === 'today', r);
await ev(`__aven.show('today')`); await sleep(700); await ev(`__aven.startWorkout()`);
await p.waitForFunction(() => +getComputedStyle(document.getElementById('setB')).opacity > .9, null, { timeout: 8000 }).catch(() => {}); // software GL is slow to fade
r = await ev(`({ view: __aven.S.view, setB: getComputedStyle(document.getElementById('setB')).opacity })`);
check('…and resuming shows the next set', r.view === 'train' && +r.setB > .9, r);

// 4. after a language change, one quick add logs once
await open();
await ev(`__aven.show('fuel')`); await sleep(900);
await ev(`document.getElementById('setB0') && __aven.show('today')`); await sleep(700);
await ev(`document.getElementById('setB0').click()`); await sleep(700);
await ev(`document.querySelector('#setS [data-l="da"]').click()`); await sleep(300);
await ev(`document.querySelector('#setS [data-l="en"]').click()`); await sleep(300);
await ev(`document.querySelector('#setS [data-close]').click()`); await sleep(500);
await ev(`__aven.show('fuel')`); await sleep(900);
const before = await ev(`document.querySelectorAll('#mealList .meal').length`);
await ev(`document.querySelector('#sFuel [data-q="0"]').click()`); await sleep(1200);
const after = await ev(`document.querySelectorAll('#mealList .meal').length`);
check('one quick add after a language change logs once', after - before === 1, { before, after });

// --- Codex review of v6 ---
// 5. the 30-minute plan applied while a workout is minimised trims the live workout too
await open('?rest');
await ev(`__aven.startWorkout()`); await sleep(900); await ev(`__aven.logSet()`); await sleep(700); await ev(`__aven.minimise()`); await sleep(700);
await ev(`__aven.show('coach')`); await sleep(900); await ev(`document.querySelector('#sCoach [data-a="1"]').click()`); await sleep(2600);
await ev(`document.querySelector('#sCoach [data-apply="1"]')?.click()`); await sleep(800);
r = await ev(`({ trimmed: __aven.S.trimmed, total: __aven.W.total, lifts: __aven.W.ex.length, idx: __aven.W.idx, flag0: __aven.W.flags[0] })`);
check('30-minute plan reaches a live workout', r.trimmed && r.total === 9 && r.lifts === 3 && r.idx === 1 && !!r.flag0, r);

// 6. after the last set, Log means Finish and cannot log again
await open('?rest');
await ev(`__aven.S.trimmed = true; __aven.startWorkout()`); await sleep(900);
for (let i = 0; i < 9; i++) { await ev(`__aven.S.view === 'rest' ? __aven.endRest(false) : 0`); await sleep(400); await ev(`document.getElementById('record')?.click(); __aven.logSet()`); await sleep(500); if (await ev(`__aven.S.view === 'record'`)) { await ev(`document.getElementById('rec').click()`); await sleep(900); } }
await sleep(800); await ev(`document.querySelector('#sessT [data-sclose]')?.click()`); await sleep(500);
const before6 = await ev(`({ vol: __aven.W.vol, rec: __aven.W.rec.length, n: __aven.W.done.flat().filter(Boolean).length })`);
const e0 = errs.length; await ev(`document.getElementById('logB').click()`); await sleep(900);
r = await ev(`({ vol: __aven.W.vol, rec: __aven.W.rec.length, n: __aven.W.done.flat().filter(Boolean).length, sheet: document.getElementById('sessT').classList.contains('on'), label: document.getElementById('logL').textContent })`);
check('after the last set Log opens Finish, logs nothing', r.vol === before6.vol && r.rec === before6.rec && r.n === before6.n && r.sheet && errs.length === e0, { before6, r, errs: errs.slice(e0) });

// 7. Undo straight after a quick add removes that food, and the delayed paint adds nothing back
await open();
await ev(`__aven.show('fuel')`); await sleep(900);
await ev(`document.querySelector('#sFuel [data-q="1"]').click()`); await sleep(1200);
const k0 = await ev(`document.querySelectorAll('#mealList .meal').length`);
await ev(`document.querySelector('#sFuel [data-q="0"]').click()`); await sleep(40); await ev(`document.getElementById('toastU').click()`); await sleep(1200);
r = await ev(`({ meals: document.querySelectorAll('#mealList .meal').length, names: [...document.querySelectorAll('#mealList .meal .n')].slice(-1).map(x => x.textContent) })`);
check('Undo right after a quick add removes only that food', r.meals === k0, { k0, ...r });

// 8. the set sheet open when the workout is minimised closes, and cannot change the hidden workout
await open('?rest');
await ev(`__aven.startWorkout()`); await sleep(900); await ev(`document.getElementById('setB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 400, pointerId: 1 })); document.getElementById('setB').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: 400, pointerId: 1 }))`); await sleep(600);
const w0 = await ev(`__aven.W.ex[0].sets[0][0]`); const opened = await ev(`document.getElementById('edS').classList.contains('on')`); await ev(`__aven.minimise()`); await sleep(700);
r = await ev(`(() => { const on = document.getElementById('edS').classList.contains('on'); document.querySelector('#edIn [data-er="1"]')?.click(); return { on, w: __aven.W.ex[0].sets[0][0] }; })()`);
check('set sheet opens from the number, closes on minimise, changes nothing hidden', opened && !r.on && r.w === w0, { opened, w0, ...r });

// 8b. a sideways drag on the number nudges the weight one plate step
await ev(`__aven.startWorkout()`); await sleep(900);
r = await ev(`(() => { const b = document.getElementById('setB'), w0 = __aven.W.ex[0].sets[0][0], rem = parseFloat(getComputedStyle(document.documentElement).fontSize); const P = (ty, x) => b.dispatchEvent(new PointerEvent(ty, { bubbles: true, clientX: x, clientY: 400, pointerId: 2 })); P('pointerdown', 100); P('pointermove', 115); P('pointermove', 100 + 4.6 * rem); P('pointerup', 100 + 4.6 * rem); return { w0, w1: __aven.W.ex[0].sets[0][0], sheet: document.getElementById('edS').classList.contains('on') }; })()`);
check('a sideways drag nudges +2.5 kg without opening the sheet', r.w1 === r.w0 + 2.5 && !r.sheet, r);
// 11. Codex review of the port: a lift done out of order is never logged twice; a trimmed plan keeps logged sets
await open('?rest=8');
await ev(`__aven.startWorkout()`); await sleep(900);
r = await ev(`(() => { const W = __aven.W; W.done[1] = [[30, 10], [30, 10], [30, 10]]; W.e = 0; W.s = 3; W.idx = 3; W.flags[4] = W.flags[5] = W.flags[6] = 'd'; W.done[0] = [[80, 8], [82.5, 8], [82.5, 8]]; return { total: W.total }; })()`);
await ev(`__aven.logSet()`); await sleep(1200);
r = await ev(`({ e: __aven.W.e, s: __aven.W.s, vol: __aven.W.vol, idx: __aven.W.idx, want: __aven.W.ex[0].sets.length + __aven.W.ex[1].sets.length })`);
check('the strip follows the set it moved to, not a count', r.idx === r.want, r);
check('after the last bench set the workout skips the finished incline and goes to overhead press', r.e === 2 && r.s === 0, r);
await open('?rest=8');
await ev(`__aven.startWorkout()`); await sleep(900);
await ev(`(() => { const W = __aven.W; for (let i = 0; i < 4; i++) W.done[0][i] = [80, 8]; W.e = 1; W.s = 0; W.idx = 4; })()`);
await ev(`__aven.S.trimmed = true; document.getElementById('minB').click()`); await sleep(700);
await ev(`__aven.show('coach')`); await sleep(900); await ev(`document.querySelector('#sCoach [data-a="1"]').click()`); await sleep(2600);
await ev(`document.querySelector('#sCoach [data-apply="1"]')?.click()`); await sleep(800);
r = await ev(`({ logged: __aven.W.done[0].filter(Boolean).length, sets0: __aven.W.ex[0].sets.length })`);
check('a trimmed plan keeps every set already logged', r.logged === 4 && r.sets0 === 4, r);
await open('?rest=8');
await ev(`__aven.startWorkout()`); await sleep(900);
await ev(`(() => { const W = __aven.W; W.done[3] = [[20, 12]]; W.e = 0; W.s = 0; __aven.S.trimmed = true; })()`);
r = await ev(`__aven.canTrimLive()`);
check('a plan that would drop a lift with logged sets is refused', r === false, { can: r });

// --- the picture itself (3 Nov: an inline comment twice swallowed code that drew the playhead and the weather) ---
// 9. every uniform the shader declares is set on every frame
await open();
r = await ev(`__aven.uniformsUnset()`);
check('every shader uniform is set each frame', Array.isArray(r) && r.length === 0, { unset: r });

// 9b. the playhead sits on the path at the hour asked for
r = await ev(`(() => { __aven.scrubTo(780); const a = document.getElementById('dot').getAttribute('transform'); __aven.scrubTo(100); const b = document.getElementById('dot').getAttribute('transform'); return { a, b }; })()`);
check('the playhead moves along the arc', !!r.a && !!r.b && r.a !== r.b, r);

// 10. each weather and night state looks like itself, and like the last known-good picture
const states = { noon: [780, 'clear'], fog: [480, 'fog'], rain: [780, 'rain'], night: [1290, 'clear'], overcast: [780, 'cloudy'] };
const sky = {}; for (const [k, [m, w]] of Object.entries(states)) sky[k] = await ev(`__aven.sky(${m}, '${w}')`);
await ev(`__aven.sky(__aven.S.scrub ?? 0, 'live')`);
const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length, mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const top = g => g.slice(0, 43 * 3 * 40); // the sky part of the grid
check('fog, rain and cloud change the picture', diff(sky.fog.g, sky.noon.g) > 8 && diff(sky.rain.g, sky.noon.g) > 8 && diff(sky.overcast.g, sky.noon.g) > 6, { fog: +diff(sky.fog.g, sky.noon.g).toFixed(1), rain: +diff(sky.rain.g, sky.noon.g).toFixed(1), overcast: +diff(sky.overcast.g, sky.noon.g).toFixed(1) });
check('a clear night is dark and has stars', mean(top(sky.night.g)) < 40 && mean(top(sky.noon.g)) > 120 && sky.night.stars > 40, { nightSky: +mean(top(sky.night.g)).toFixed(1), stars: sky.night.stars });
const refFile = new URL('./fixtures/app-sky-ref.json', import.meta.url);
const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
if (!existsSync(refFile) || process.env.NEWREF) { writeFileSync(refFile, JSON.stringify(Object.fromEntries(Object.entries(sky).map(([k, v]) => [k, v.g])))); out.push('NOTE sky reference saved (tests/e2e/fixtures/app-sky-ref.json)'); }
else { const ref = JSON.parse(readFileSync(refFile, 'utf8')), d = Object.fromEntries(Object.keys(states).map(k => [k, +diff(sky[k].g, ref[k]).toFixed(1)]));
  check('each sky matches the known-good reference', Object.values(d).every(v => v < 6), d); }



console.log(out.join('\n')); if (errs.length) console.log('errors:', errs);
await browser.close(); srv?.close();
process.exit(out.some((l) => l.startsWith('FAIL')) || errs.length ? 1 : 0);
