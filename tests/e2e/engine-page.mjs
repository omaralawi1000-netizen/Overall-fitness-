// End-to-end check of the /engine/ debug page in a real Chromium, with made-up data only.
// Run: node --experimental-strip-types tests/e2e/engine-page.mjs [url]
// Default url: the live page. Every check starts from a fresh browser profile, so nothing real is ever touched.
import { readFileSync } from 'node:fs';
import { oldData } from '../engine/fixtures/oldBackup.ts';

const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const URL = process.argv[2] ?? 'https://omaralawi1000-netizen.github.io/Overall-fitness-/engine/';
const browser = await pw.chromium.launch();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };
const txt = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 384, height: 860 }, deviceScaleFactor: 2, acceptDownloads: true });
  const errors = [];
  const open = async () => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForSelector('#status:not(:empty)');
    return p;
  };
  return { ctx, open, errors };
}
/** What the database really holds, read straight from IndexedDB (not the page's memory). */
const db = (p) => p.evaluate(() => new Promise((res, rej) => {
  const r = indexedDB.open('a2.data');
  r.onerror = () => rej(r.error);
  r.onsuccess = () => {
    const d = r.result, tx = d.transaction(['records', 'actions'], 'readonly');
    const a = tx.objectStore('records').getAll(), b = tx.objectStore('actions').getAll();
    tx.oncomplete = () => { res({ records: a.result, actions: b.result }); d.close(); };
  };
}));
const live = (d, kind) => d.records.filter((r) => r.kind === kind && !r.deleted);
const restText = async (p) => (await p.textContent('#rest')).trim();
const toSec = (t) => { const m = /(\d+):(\d+)/.exec(t); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

// 1. Import from old Aven (one-tap copy), reload: still there and shown
{
  const { ctx, open, errors } = await fresh();
  const p = await open();
  await p.evaluate((d) => localStorage.setItem('aven.v1', d), JSON.stringify(oldData()));
  const before = await p.evaluate(() => localStorage.getItem('aven.v1'));
  await p.click('#importLocal');
  await p.waitForSelector('button[data-i="go"]');
  check('import: dry run writes nothing', live(await db(p), 'session').length === 0);
  await p.click('button[data-i="go"]');
  await p.waitForFunction(() => document.querySelector('#fail')?.textContent?.includes('Imported'));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#saved li');
  const saved = await txt(p, '#saved');
  check('import: after reload the workout and food are listed', saved.includes('Push') && /kcal/.test(saved), saved.slice(0, 120));
  check('import: database holds it', live(await db(p), 'session').length === 1 && live(await db(p), 'food').length === 3);
  check('import: old Aven unchanged', (await p.evaluate(() => localStorage.getItem('aven.v1'))) === before);
  check('import: storage kept was asked', !/not asked yet/.test(await txt(p, '#status')), await txt(p, '#status'));
  await p.click('#importLocal');
  await p.waitForSelector('#import p');
  check('import: again finds nothing new to add', /Will add 0/.test(await txt(p, '#import')));
  check('import: no page errors', errors.length === 0, errors.join('; '));
  await ctx.close();
}

// 2. Export, delete everything, restore the file, reload
{
  const { ctx, open, errors } = await fresh();
  const p = await open();
  await p.click('button[data-a="start"]');
  await p.click('button[data-a="tick"] >> nth=0');
  await p.click('button[data-a="finish"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export')]);
  const file = await dl.path();
  const json = JSON.parse(readFileSync(file, 'utf8'));
  check('backup: file has a checksum and the workout', /^[0-9a-f]{64}$/.test(json.checksum) && json.counts.session === 1);
  await Promise.all([p.waitForEvent('load'), p.click('#wipe')]);
  await p.waitForSelector('#status:not(:empty)');
  check('backup: delete everything empties a2', (await db(p)).records.length === 0);
  await p.setInputFiles('#restoreFile', file);
  await p.waitForSelector('button[data-r="merge"]');
  check('backup: preview before anything changes', (await db(p)).records.length === 0 && /Found/.test(await txt(p, '#restore')));
  await p.click('button[data-r="merge"]');
  await p.waitForFunction(() => document.querySelector('#fail')?.textContent?.includes('Restored'));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#saved li');
  const d = await db(p);
  check('backup: restored after reload, with the done set', live(d, 'session').length === 1 && live(d, 'set').filter((s) => s.done).length === 1);
  const bad = structuredClone(json); bad.records[0].day = '1999-01-01';
  await p.setInputFiles('#restoreFile', { name: 'edited.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
  await p.waitForSelector('#restore .bad');
  check('backup: an edited file is refused', /Nothing was changed/.test(await txt(p, '#restore')));
  check('backup: no page errors', errors.length === 0, errors.join('; '));
  await ctx.close();
}

// 3. Rest timer across reload, pause, ±15; double tap; Undo
{
  const { ctx, open, errors } = await fresh();
  const p = await open();
  await p.click('button[data-a="start"]');
  // a double tap on Tick: the button under the finger must not untick it again
  await p.dblclick('button[data-a="tick"] >> nth=0');
  await p.waitForTimeout(300);
  let d = await db(p);
  check('double tap: the set is ticked once', live(d, 'set').filter((s) => s.done).length === 1 && d.actions.filter((a) => a.type === 'set.tick').length === 1 && d.actions.filter((a) => a.type === 'set.untick').length === 0,
    `${d.actions.map((a) => a.type).join(',')}`);
  await p.waitForTimeout(1200);
  const a1 = toSec(await restText(p));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#rest .big');
  const a2 = toSec(await restText(p));
  check('timer: reload continues from the same time, no jump', a1 <= 90 && a2 <= a1 && a1 - a2 <= 3, `${a1}s → ${a2}s`);
  await p.click('button[data-a="r+15"]');
  await p.waitForTimeout(200);
  const a3 = toSec(await restText(p));
  check('timer: +15 s', a3 - a2 >= 13 && a3 - a2 <= 16, `${a2}s → ${a3}s`);
  await p.click('button[data-a="pause"]');
  await p.waitForTimeout(300);
  const b1 = await restText(p);
  await p.waitForTimeout(2100);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#rest .big');
  check('timer: paused stays frozen, also after reload', (await restText(p)) === b1 && /paused/.test(b1), `${b1} / ${await restText(p)}`);
  await p.click('button[data-a="resume"]');
  // Undo the tick from the history
  const tick = (await db(p)).actions.find((a) => a.type === 'set.tick');
  await p.click(`button[data-u="${tick.id}"]`);
  await p.waitForTimeout(300);
  let msg = await txt(p, '#fail');
  if (/Undo the rest/.test(msg)) { await p.click('button[data-u2]'); await p.waitForTimeout(300); msg = await txt(p, '#fail'); }
  d = await db(p);
  check('undo: the tick is taken back in the database', live(d, 'set').filter((s) => s.done).length === 0, msg);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#workout button');
  check('undo: still undone after reload', live(await db(p), 'set').filter((s) => s.done).length === 0);
  check('timer/undo: no page errors', errors.length === 0, errors.join('; '));
  await ctx.close();
}

// 4. Two tabs on the same data
{
  const { ctx, open, errors } = await fresh();
  const a = await open(), b = await open();
  await a.click('button[data-a="start"]');
  await b.waitForSelector('button[data-a="tick"]', { timeout: 3000 }).catch(() => null);
  check('two tabs: a workout started in tab A shows in tab B', !!(await b.$('button[data-a="tick"]')));
  await Promise.all([a.click('button[data-a="tick"] >> nth=0'), b.click('button[data-a="tick"] >> nth=1')]);
  await a.waitForTimeout(800);
  const d = await db(a);
  check('two tabs: ticks from both tabs are both saved', live(d, 'set').filter((s) => s.done).length === 2, `${live(d, 'set').filter((s) => s.done).length} done`);
  const shownA = await a.$$eval('button[data-a="untick"]', (x) => x.length), shownB = await b.$$eval('button[data-a="untick"]', (x) => x.length);
  check('two tabs: both tabs show both ticks', shownA === 2 && shownB === 2, `A ${shownA}, B ${shownB}`);
  check('two tabs: no page errors', errors.length === 0, errors.join('; '));
  await ctx.close();
}

// 5. The browser killed (SIGKILL) in the middle of a big save: all or nothing
{
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  let partial = 0, whole = 0, none = 0;
  for (let i = 0; i < 8; i++) {
    const dir = mkdtempSync(join(tmpdir(), 'a2-kill-'));
    let ctx = await pw.chromium.launchPersistentContext(dir, { viewport: { width: 384, height: 860 } });
    let p = ctx.pages()[0] ?? await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForSelector('#status:not(:empty)');
    await p.evaluate((d) => localStorage.setItem('aven.v1', d), JSON.stringify(oldData()));
    await p.click('#importLocal');
    await p.waitForSelector('button[data-i="go"]');
    await p.evaluate(() => document.querySelector('button[data-i="go"]').click());
    await new Promise((r) => setTimeout(r, i * 3)); // 0–21 ms into the write
    (await import('node:child_process')).spawnSync('pkill', ['-9', '-f', dir]); // kill every Chrome process of this profile
    await ctx.close().catch(() => null);
    ctx = await pw.chromium.launchPersistentContext(dir, { viewport: { width: 384, height: 860 } });
    p = ctx.pages()[0] ?? await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForSelector('#status:not(:empty)');
    const d = await db(p);
    const n = d.records.length, acts = d.actions.length;
    if (n === 0 && acts === 0) none++; else if (n === 23 && acts === 1) whole++; else partial++;
    await ctx.close();
  }
  check('killed browser: an import is all or nothing, never half', partial === 0, `${whole} whole, ${none} none, ${partial} half`);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
