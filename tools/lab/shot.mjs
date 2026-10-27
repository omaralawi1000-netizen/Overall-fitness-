// usage: node shot.mjs <v> <s1,s2,...> [outdir] [clickSel]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [v, ss, out = '/tmp/claude-0/lab/shots', click] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 2, colorScheme: 'dark', hasTouch: true, isMobile: true });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
for (const s of ss.split(',')) {
  await p.goto(`http://127.0.0.1:8765/lab/?v=${v}&s=${s}`); await p.waitForTimeout(1200);
  if (click) { await p.locator(click).first().click(); await p.waitForTimeout(900); }
  await p.screenshot({ path: `${out}/v${v}-s${s}${click ? '-c' : ''}.png` });
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
