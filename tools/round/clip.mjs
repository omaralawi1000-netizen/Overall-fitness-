// Clips of the signature moments for the motion judge: tick into rest, rest ending into the next set (both by Skip
// and by running out), a Coach proposal arriving, accepted, then undone.
// usage: node tools/round/clip.mjs <v 1|2> <dark|light> [rate] [outdir]   rate 0.5 = half speed (animations only).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { renameSync } from 'node:fs';
const [v = '1', scheme = 'dark', rate = '1', out = '/tmp/claude-0/round/clips'] = process.argv.slice(2);
const r = Number(rate);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true, isMobile: true, recordVideo: { dir: out, size: { width: 384, height: 832 } } });
const p = await ctx.newPage();
const wait = (ms) => p.waitForTimeout(ms / r);
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
if (r !== 1) { const c = await ctx.newCDPSession(p); await c.send('Animation.enable'); await c.send('Animation.setPlaybackRate', { playbackRate: r }); }
const tap = async (sel) => { const l = p.locator(sel).filter({ visible: true }).first(); if (await l.count()) await l.tap({ timeout: 3000 }).catch(() => console.log('could not tap', sel)); else console.log('not on screen:', sel); };
await p.goto(`http://127.0.0.1:8765/round/?v=${v}`);
await wait(1500);
await tap(v === '1' ? '.start' : '.card .start'); await wait(1400);
await tap('.cta'); await wait(1800);            // tick set 1 into rest
await tap('.cta'); await wait(1400);            // skip: rest ends into set 2
await tap('.cta'); await wait(2800);            // tick set 2: rest, the Coach's proposal arrives
if (v === '1') {
  const l = p.locator('.slide').first(); const bb = await l.boundingBox();
  await p.mouse.move(bb.x + 30, bb.y + bb.height / 2); await p.mouse.down();
  for (let i = 1; i <= 14; i++) { await p.mouse.move(bb.x + 30 + (bb.width * i) / 14, bb.y + bb.height / 2); await p.waitForTimeout(16 / r); }
  await p.mouse.up();
} else await tap('.use');
await wait(1600);                                // accepted
await tap('.ap-undo'); await wait(1600);         // undone
await tap('[data-adj="-15"]'); await wait(300);
await tap('[data-adj="-15"]'); await wait(300);
await p.waitForFunction(() => document.querySelector('.wo')?.dataset.phase === 'work', null, { timeout: 30000 / Math.min(1, r) }).catch(() => console.log('rest did not end'));
await wait(1600);                                // rest ran out into set 3
const path = await p.video().path();
await ctx.close(); await b.close();
const name = `${out}/v${v}-${scheme}-x${rate}.webm`;
renameSync(path, name);
console.log(name, errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
