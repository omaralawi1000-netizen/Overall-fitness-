// Clips of each look's moments (tick, rest, next set, Apply/Undo, trim) for the motion judge.
// usage: node tools/looks/clip.mjs <v> <dark|light> [rate] [outdir]   rate 0.5 = half speed (animations only).
// Serve site/ first: python3 -m http.server 8765 --bind 127.0.0.1 (from site/).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { renameSync } from 'node:fs';
const [v = '1', scheme = 'dark', rate = '1', out = '/tmp/claude-0/looks/clips'] = process.argv.slice(2);
const r = Number(rate), wait = (ms) => p.waitForTimeout(ms / r);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true, isMobile: true, recordVideo: { dir: out, size: { width: 384, height: 832 } } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
if (r !== 1) { const c = await ctx.newCDPSession(p); await c.send('Animation.enable'); await c.send('Animation.setPlaybackRate', { playbackRate: r }); }
const tap = async (sel) => {
  const l = p.locator(sel).filter({ visible: true }).first();
  if (await l.count()) await l.tap({ timeout: 3000 }).catch(() => console.log('could not tap', sel));
  else console.log('not on screen:', sel);
};
await p.goto(`http://127.0.0.1:8765/looks/?v=${v}`);
await wait(1500);
await tap('[data-act="trim-apply"]'); await wait(1400);            // Today: Apply the trim
await tap('[data-act="trim-undo"]'); await wait(1400);
await tap('[data-act="slab"], [data-act="go"]'); await wait(1400);  // open the workout
await tap('[data-act="bump-apply"]'); await wait(1200);           // Apply the Coach's 82.5
await tap('[data-act="bump-undo"]'); await wait(1200);
await tap('[data-act="bump-apply"]'); await wait(1000);
await tap('[data-act="slab"], [data-act="go"]'); await wait(2600); // tick set 3 (a record), rest runs
await tap('[data-act="slab"], [data-act="go"]'); await wait(1600); // skip rest: next set
await tap('[data-act="slab"], [data-act="go"]'); await wait(1600); // tick set 4
await tap('[data-act="untick"]'); await wait(1600); // undo it
const path = await p.video().path();
await ctx.close(); await b.close();
const name = `${out}/v${v}-${scheme}-x${rate}.webm`;
renameSync(path, name);
console.log(name, errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
