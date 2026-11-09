// Performance check: does the app stay inside its speed budget while it is used? Free, headless, no paid services.
// Run: npm run perf [-- url] [--report] [--runs N]      (default target: dist/app/ if built, else the Window prototype in site/)
//   --report   print the measurements only and never fail (use it to see where the app stands before setting numbers)
// What it checks, per screen and per moment (budget numbers: tests/e2e/perf-budget.json, rules: docs/LESSONS.md "Staying fast"):
//   1. blur budget: elements with backdrop-filter or filter:blur on each screen, none inside a scrolling area, none hidden, a radius cap
//   2. composited layers on each screen (a leading sign of GPU trouble)
//   3. Long Animation Frames while tabs switch, a workout starts, a set is ticked and the rest timer runs (worst frame, count over 50 ms)
// Structure (blur count, layers, long frames' causes) is the same headless as on the phone. Absolute frame times are NOT: headless
// uses software GL and is slower, so its limits are loose and the real frame rate is still judged on the phone (Beta).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const runs = Number(args[args.indexOf('--runs') + 1]) || 1;
const report = flag('--report');
const urlArg = args.find((a) => /^https?:/.test(a));
const budget = JSON.parse(readFileSync(new URL('./perf-budget.json', import.meta.url), 'utf8'));

const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs')).catch(() => null);
if (!pw) {
  // Playwright is not a declared dependency (Chromium comes with the cloud environment), so a clean checkout can't run this.
  // Say so loudly instead of passing silently; PERF_REQUIRED=1 turns it into a failure (use it where Chromium is guaranteed).
  console.error('NOT RUN perf: Playwright is not installed here, so NOTHING was measured. Run `npm run perf` where Chromium exists.');
  process.exit(process.env.PERF_REQUIRED ? 1 : 0);
}

const repo = join(import.meta.dirname, '../..');
const exists = (f) => stat(f).then(() => true, () => false);
const root = (await exists(join(repo, 'dist/app/index.html'))) ? join(repo, 'dist/app') : join(repo, 'site/_prototypes/window');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
let srv = null, base = urlArg;
if (!base) {
  srv = http.createServer(async (q, r) => {
    let f = join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    try { const d = await readFile(f); r.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); r.end(d); } catch { r.writeHead(404); r.end(); }
  }).listen(0);
  base = `http://localhost:${srv.address().port}/`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
// nothing from outside is fetched (web fonts would only slow a headless run down); the app falls back to system type, which is fine for counting
await ctx.route('**/*', (r) => (r.request().url().startsWith(base) || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(p);
let layers = 0; cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers.length; });

const open = async (q) => { await p.goto(base + q, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await sleep(800); await cdp.send('LayerTree.disable').catch(() => {}); await cdp.send('LayerTree.enable'); };
const ev = (s) => p.evaluate(s);

// ---- 1 and 2: what is on each screen ----
const scan = async () => { layers = 0; await cdp.send('LayerTree.disable').catch(() => {}); await cdp.send('LayerTree.enable'); await ev(`document.body.style.outline = '0'`); await sleep(500); return scanDom(); };
const scanDom = () => p.evaluate(() => {
  const vh = innerHeight, vw = innerWidth, out = { blur: 0, inScroller: 0, hidden: 0, maxPx: 0, list: [] };
  const scroller = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 4) return true; } return false; };
  const shown = (el) => { for (let a = el; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden') return 'none'; if (+s.opacity < 0.02) return 'hidden'; } const r = el.getBoundingClientRect(); return (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) ? 'hidden' : 'shown'; };
  const targets = [];
  for (const el of document.querySelectorAll('*')) { targets.push([el, null]); for (const ps of ['::before', '::after']) { const c = getComputedStyle(el, ps).content; if (c && c !== 'none' && c !== 'normal') targets.push([el, ps]); } }
  for (const [el, ps] of targets) {
    const s = getComputedStyle(el, ps), bd = s.backdropFilter || s.webkitBackdropFilter || 'none', f = s.filter || 'none';
    const hasBd = bd !== 'none' && /blur/.test(bd), hasF = f !== 'none' && /blur/.test(f);
    if (!hasBd && !hasF) continue;
    const st = shown(el); if (st === 'none') continue; // display:none costs nothing
    const px = Math.max(...[...(bd + ' ' + f).matchAll(/blur\(([\d.]+)px\)/g)].map((m) => +m[1]), 0);
    out.blur++; out.maxPx = Math.max(out.maxPx, px);
    const sc = scroller(el); if (sc) out.inScroller++; if (st === 'hidden') out.hidden++;
    out.list.push(`${el.tagName.toLowerCase()}${ps || ''}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} ${px}px${sc ? ' IN-SCROLLER' : ''}${st === 'hidden' ? ' HIDDEN' : ''}`);
  }
  return out;
});

// ---- 3: long animation frames during a moment ----
const moment = async (name, act, wait = 700) => {
  await ev(`(() => { window.__laf = []; window.__lafOff = false; window.__lafObs?.disconnect(); try { window.__lafObs = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__laf.push(e.duration); }); window.__lafObs.observe({ type: 'long-animation-frame', buffered: false }); } catch { window.__lafOff = true; } })()`);
  await act(); await sleep(wait);
  const r = await ev(`(() => { if (window.__lafObs) { for (const e of window.__lafObs.takeRecords()) window.__laf.push(e.duration); window.__lafObs.disconnect(); window.__lafObs = null; } return { off: !!window.__lafOff, d: window.__laf }; })()`);
  return { off: r.off, worst: Math.round(Math.max(0, ...r.d)), over: r.d.length };
};

const screens = {}; const res = { moments: {} };
await open('?rest=8&nosw&nosave');
// self-test: a frame we block on purpose must be seen, otherwise "0 long frames" would mean nothing
let meterWorks = false;
for (let i = 0; i < 3 && !meterWorks; i++) {
  const probe = await moment('probe', () => ev(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => { document.body.style.outline = '1px solid transparent'; const t = performance.now(); while (performance.now() - t < 160); r(); })))`), 600);
  meterWorks = !probe.off && probe.worst >= 100;
}
for (const tab of ['today', 'train', 'fuel', 'health', 'coach']) {
  await ev(`__aven.show('${tab}')`); await sleep(1200);
  screens[tab] = { ...(await scan()), layers };
}
await ev(`__aven.show('today')`); await sleep(600);
const specs = {
  'tab switch': { act: async () => { for (const t of ['fuel', 'train', 'health', 'coach', 'today']) { await ev(`__aven.show('${t}')`); await sleep(450); } }, wait: 300 },
  'start workout': { act: () => ev(`__aven.startWorkout()`), wait: 1200 },
  'tick a set': { act: () => ev(`__aven.logSet()`), wait: 1200 },
  'rest timer': { act: async () => { await sleep(2500); }, wait: 200 },
};
const samples = {}; for (const k of Object.keys(specs)) samples[k] = [];
for (let i = 0; i < runs; i++) {
  await open('?rest=8&nosw&nosave'); await ev(`__aven.show('today')`); await sleep(500);
  for (const [k, s] of Object.entries(specs)) {
    if (k === 'tab switch' || i === 0 || k !== 'start workout') { /* each run replays the whole sequence from a fresh page */ }
    samples[k].push(await moment(k, s.act, s.wait));
    if (k === 'tick a set') screens['rest view'] = { ...(await scan()), layers };
  }
}
for (const [k, a] of Object.entries(samples)) res.moments[k] = { worst: median(a.map((x) => x.worst)), over: median(a.map((x) => x.over)), off: a.some((x) => x.off) };

// ---- verdict ----
const lines = [], fails = [], above = [];
const L = budget.limit, G = budget.goal;
const row = (ok, text) => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${text}`); if (!ok) fails.push(text); };
for (const [name, s] of Object.entries(screens)) {
  const bad = [];
  if (s.blur > L.blurPerScreen) bad.push(`${s.blur} blurred > ${L.blurPerScreen}`);
  if (s.inScroller > L.blurInScroller) bad.push(`${s.inScroller} inside a scrolling area`);
  if (s.hidden > L.blurHidden) bad.push(`${s.hidden} blurred but hidden`);
  if (s.maxPx > L.maxBlurPx) bad.push(`radius ${s.maxPx}px > ${L.maxBlurPx}px`);
  if (s.layers > L.layersPerScreen) bad.push(`${s.layers} layers > ${L.layersPerScreen}`);
  const over = [s.blur - s.hidden > G.visibleBlurPerScreen && 'visible blur', s.inScroller > G.blurInScroller && 'blur in scroller', s.hidden > G.blurHidden && 'hidden blur', s.maxPx > G.maxBlurPx && 'radius'].filter(Boolean);
  if (over.length) above.push(`${name}: ${over.join(', ')}`);
  row(!bad.length, `screen ${name}: ${s.blur} blurred (${s.blur - s.hidden} visible), ${s.inScroller} in scroller, ${s.hidden} hidden, max ${s.maxPx}px, ${s.layers ? s.layers + ' layers' : 'layers not read'}${bad.length ? ' · ' + bad.join('; ') : ''}${s.blur ? '\n     ' + s.list.join('\n     ') : ''}`);
}
for (const [name, m] of Object.entries(res.moments)) {
  if (!meterWorks) { lines.push(`NOTE ${name}: the frame meter did not see a deliberately blocked 160 ms frame, so frames were not measured`); continue; }
  if (m.off) { lines.push(`NOTE ${name}: this Chromium has no Long Animation Frames, so frames were not measured`); continue; }
  const bad = [];
  if (m.worst > L.worstFrameMs) bad.push(`worst frame ${m.worst} ms > ${L.worstFrameMs} ms`);
  if (m.over > L.longFramesPerMoment) bad.push(`${m.over} long frames > ${L.longFramesPerMoment}`);
  row(!bad.length, `moment ${name}: worst frame ${m.worst} ms, ${m.over} long frames (median of ${runs})${bad.length ? ' · ' + bad.join('; ') : ''}`);
}
if (above.length) lines.push('GOAL (not a failure, a report): above the research goal on ' + above.length + ' screens: ' + above.join(' | '));
if (errs.length) row(false, `page errors: ${errs.slice(0, 3).join(' | ')}`);
console.log(`perf target: ${base}${urlArg ? '' : ' (' + root.replace(repo + '/', '') + ')'}\n` + lines.join('\n'));
console.log('Headless limits are loose on purpose; real fps is judged on the phone (Beta). Budget: tests/e2e/perf-budget.json');
await browser.close(); srv?.close();
process.exit(!report && fails.length ? 1 : 0);
