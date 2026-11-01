// Screens of the final-round shells at phone width. usage: node tools/round/shot.mjs <v 1|2|3> <dark|light> [outdir] [day]
// Serve site/ first: python3 -m http.server 8765 --bind 127.0.0.1 (from site/).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [v = '1', scheme = 'dark', out = '/tmp/claude-0/round', day = 'train'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 384, height: Number(process.env.H || 832) }, deviceScaleFactor: 2, colorScheme: scheme, hasTouch: true, isMobile: true });
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
const name = `v${v}-${scheme}${day === 'rest' ? '-rest' : ''}`;
const shot = (n) => p.screenshot({ path: `${out}/${name}-${n}.png` });
const tap = async (sel) => { const l = p.locator(sel).filter({ visible: true }).first(); if (await l.count()) await l.tap({ timeout: 3000 }).catch((e) => console.log('tap fail', sel, String(e).slice(0, 80))); else console.log('missing', sel); };
await p.goto(`http://127.0.0.1:8765/round/?v=${v}${day === 'rest' ? '&day=rest' : ''}`);
await p.waitForTimeout(1500);
await shot('01-today');
await p.locator('.scroll').first().evaluate((e) => e.scrollTo(0, 400)); await p.waitForTimeout(400);
await shot('02-today-scrolled');
await p.locator('.scroll').first().evaluate((e) => e.scrollTo(0, 0));
const steps = JSON.parse(process.env.STEPS || '[]');
let k = 3;
for (const [sel, wait, label] of steps) {
  if (sel.startsWith('type:')) { await p.keyboard.type(sel.slice(5)); }
  else if (sel.startsWith('press:')) { await p.keyboard.press(sel.slice(6)); }
  else if (sel.startsWith('drag:')) { const l = p.locator(sel.slice(5)).filter({ visible: true }).first(); const bb = await l.boundingBox(); if (bb) { await p.mouse.move(bb.x + 30, bb.y + bb.height / 2); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(bb.x + 30 + (bb.width * i) / 12, bb.y + bb.height / 2); await p.waitForTimeout(16); } await p.mouse.up(); } else console.log('missing', sel); }
  else if (sel !== 'wait') await tap(sel);
  await p.waitForTimeout(wait);
  if (label) { await shot(String(k).padStart(2, '0') + '-' + label); k++; }
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
await b.close();
