// The yardstick's people check (docs/COACH.md §8): a blind page of 6 pairs that Omar and 3 to 5 testers tap on a phone.
//   npx vitest run --config exam/vitest.config.ts exam/yardstick/build-pairs-page.test.ts
// Env: EXAM_OUT     the folder with answers.jsonl (the same saved answers the judges read)
//      PAIRS_SETUPS the two setups, e.g. sonnetfable,opusformat
//      PAIRS_HTML   where to write the page (publish it as an Artifact with the db and user capabilities)
//      PAIRS_KEY    where to write the key (which reply is which setup). Keep it OUT of the repo and out of the page.
// Free: no model is called. The page stores picks per viewer in its db (`picks/<viewer id>`, field `builds.<page id>`, so a
// rebuilt page keeps earlier builds' picks; readable only by the owner and editors); a viewer who can't write gets a short code to send instead. Each viewer sees the two replies in their
// own random order, and the pick buttons wake after 6 seconds, so a tap without reading is not a pick.
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomInt } from 'node:crypto';
import { caseHash, type CaseRun } from '../v2/run-case';
import { CASES } from '../v2/cases';

/** what a person needs to judge each reply, written from the case's fact sheet: never from the replies */
const CONTEXT: Record<string, { context: string; notice?: string }> = {
  'p03-want-to-quit': { context: 'Nora, a beginner. 5 sessions in the last 4 weeks (2, 2, 1, then 0 a week). Same weights and reps for her last 5 sessions. Food logged on 10 of 28 days, about 860 kcal a day on those days. No weigh-ins.' },
  'p10-footballer-speed-da': { context: 'Mikkel, new to the app, nothing logged yet. His plan has two full-body sessions a week (Thursday and Monday).' },
  'o09-healthy-adult-creatine': { context: 'Sara, 22, a powerlifter on a bulk who eats no dairy. Trains 3 times a week; lifts going up.' },
  'p14-race-week-da': { context: 'Freja, 34, a half-marathon runner. Ran 3 times last week. Had a sore knee in the spring (healed). It is Monday morning.' },
  'n02-notice-low-intake': { context: 'Nora again: 2, 2, 1, then 0 sessions a week; lifts up a little; food logged on 10 of 28 days, about 860 kcal a day on those days.', notice: 'No message from her: the coach writes first, as a weekly check-in.' },
  'c01-conflicting-sleep': { context: 'Noah, a nurse on rotating shifts. His watch says he slept 8.1 hours last night. Nothing is planned today; his next session is tomorrow.' },
};

/** "Did in the app: …" lines leave the words and become chips, as in the app; Apply buttons too */
function split(text: string): { text: string; chips: string[] } {
  const chips: string[] = [];
  const kept = text.split('\n').filter((l) => {
    const m = l.match(/^(?:Did in the app|Gjort i appen):\s*(.+?)(?:\s*·\s*(?:Undo|Fortryd))?\s*$/u);
    if (m) chips.push(`Done in the app: ${m[1]}`);
    return !m;
  });
  return { text: kept.join('\n').trim(), chips };
}

it('builds the blind pairs page and its key', () => {
  const IN = process.env.EXAM_OUT!;
  const [A, B] = (process.env.PAIRS_SETUPS ?? 'sonnetfable,opusformat').split(',').map((s) => s.trim());
  const rows = readFileSync(`${IN}/answers.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as CaseRun & { run?: number; key: string });
  // the newest run-1 answer whose case is unchanged: run-answers appends a new row when the Coach changes
  const get = (id: string, setup: string) => rows.filter((r) => r.id === id && r.setup === setup && (r.run ?? 1) === 1 && r.caseHash === caseHash(CASES.find((c) => c.id === id)!)).at(-1);
  const page = randomBytes(3).toString('hex');
  const key: Record<string, { case: string; r1: string; r2: string; rows: [string, string] }> = {};
  const pairs = Object.entries(CONTEXT).map(([id, ctx], k) => {
    const a = get(id, A), b = get(id, B);
    if (!a?.turns.at(-1)?.shown || !b?.turns.at(-1)?.shown) throw new Error(`${id}: no answer from ${a ? B : A}`);
    if (a.turns.length > 1 || b.turns.length > 1) throw new Error(`${id}: the page shows single-turn cases only`);
    const side = (r: CaseRun) => {
      const t = r.turns[0];
      const s = split(t.shown!.text);
      return { text: s.text, chips: [...s.chips, ...t.shown!.offers.map((o) => `Button shown: ${o.label}`)], more: t.more ?? '' };
    };
    const flip = randomInt(2) === 1;
    const qid = `q${k + 1}`;
    key[qid] = { case: id, r1: flip ? B : A, r2: flip ? A : B, rows: flip ? [b.key, a.key] : [a.key, b.key] };
    const lang = /-da$/.test(id) ? 'da' : 'en';
    return { id: qid, lang, context: ctx.context, ...(ctx.notice ? { notice: ctx.notice } : { message: CASES.find((c) => c.id === id)!.turns[0].text }), replies: { r1: side(flip ? b : a), r2: side(flip ? a : b) } };
  });
  const tpl = readFileSync(new URL('./pairs-page.html', import.meta.url), 'utf8');
  // the JSON sits inside a <script> block: "</" is escaped so no reply text can close it
  writeFileSync(process.env.PAIRS_HTML!, tpl.replace('/*PAIRS*/', JSON.stringify({ page, pairs }).replace(/<\//g, '<\\/')));
  writeFileSync(process.env.PAIRS_KEY!, `${JSON.stringify({ page, built: new Date().toISOString(), source: `${IN}/answers.jsonl`, setups: [A, B], key }, null, 2)}\n`);
});

