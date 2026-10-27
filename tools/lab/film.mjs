// Films each direction at 384×832 (dark): its 3 key screens, then its 2 signature moments, at real speed.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const out = process.argv[2] || '/tmp/claude-0/lab/films';
const only = process.argv[3];
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const plans = {
  1: [[1, 1800], [2, 1500], [3, 1800], [4, 600, async (p) => { await p.locator('.f-row.cur .f-chk').first().tap(); await p.waitForTimeout(3200); }], [5, 9000]],
  2: [[1, 1800], [2, 1500], [3, 1800], [4, 7000, async (p) => { await p.locator('[data-act="apply"]').tap(); await p.waitForTimeout(1500); }], [5, 7500]],
  3: [[1, 1800], [2, 600, async (p) => { await p.locator('.d-s.cur').tap(); await p.waitForTimeout(2200); }], [3, 1800], [4, 2600], [5, 600, async (p) => { await p.locator('.d-s.cur').tap(); await p.waitForTimeout(2200); }], [6, 500, async (p) => {
    const box = await p.locator('.d-chart').boundingBox(); const y = box.y + box.height * 0.6;
    await p.mouse.move(box.x + box.width - 30, y); await p.mouse.down();
    for (let i = 0; i <= 40; i++) { await p.mouse.move(box.x + box.width - 30 - i * ((box.width - 60) / 40), y); await p.waitForTimeout(25); }
    await p.waitForTimeout(400);
    for (let i = 0; i <= 20; i++) { await p.mouse.move(box.x + 30 + i * 9.3, y); await p.waitForTimeout(25); }
    await p.mouse.up(); await p.waitForTimeout(1200); }]],
  4: [[1, 1800], [2, 600, async (p) => { await p.locator('[data-act="done"]').tap(); await p.waitForTimeout(1800); }], [3, 1800], [4, 600, async (p) => { await p.locator('[data-act="done"]').tap(); await p.waitForTimeout(3500); }], [5, 2600]],
};
for (const v of Object.keys(plans)) {
  if (only && only !== v) continue;
  const ctx = await b.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 1, colorScheme: 'dark', hasTouch: true, isMobile: true, recordVideo: { dir: out, size: { width: 384, height: 832 } } });
  const p = await ctx.newPage();
  for (const [s, wait, act] of plans[v]) {
    await p.goto(`http://127.0.0.1:8765/lab/?v=${v}&s=${s}`); await p.waitForTimeout(wait);
    if (act) await act(p);
  }
  const path = await p.video().path(); await ctx.close();
  const fs = await import('node:fs'); fs.renameSync(path, `${out}/d${v}.webm`);
  console.log('filmed', v);
}
await b.close();
