/**
 * The yes/no checker of the yardstick (docs/COACH.md §8, "The yardstick"). It reads ONE saved answer and decides each
 * item of the case's catch list: code items by code, the rest by a model asked only "does the reply do this, yes or no",
 * with the deciding words quoted first. A yes/no question leans far less on the judge's taste than "which answer is
 * better", and the same answer is never compared with anything, so the order and the opponent can't sway it.
 *
 * Two checkers from different companies (Claude and Gemini) read the same answers; an item they disagree on counts half.
 */
import { createHash } from 'node:crypto';
import { call, CallError, type CallOpts, type GeminiBody } from '../providers';
import type { CaseRun } from '../v2/run-case';
import type { ExamCase } from '../v2/cases';
import type { Item, Reply } from './catch-lists';

export type Verdict = 'yes' | 'no';
export interface ItemVerdict { verdict: Verdict; quote: string }

/** what the person saw: each turn's reply, the More under the last one, what the app really did or offered */
export function replyOf(run: CaseRun): Reply {
  const texts = run.turns.map((t) => t.shown?.text ?? t.say ?? '');
  const did = run.turns.flatMap((t) => (t.shown?.did ?? []).map((d) => d.name));
  const offers = run.turns.flatMap((t) => (t.shown?.offers ?? []).map((o) => o.proposal.name));
  const more = run.turns.at(-1)?.more;
  return { texts, did, offers, ...(more ? { more } : {}) };
}

export const CHECK_SYSTEM = `You check one reply from the AI coach of a fitness app (gym, food, running, team sports, wrestling) against a fixed list of yes/no items. You do not judge style and you compare it with nothing: for each item, decide only whether the reply does what the item says.

- You get the facts the coach had about this person, the conversation, the coach's reply (what the person sees first, one per turn), "MORE" (extra text the person can tap to unfold, if any) and what the app really did.
- An item marked [visible reply] counts only the coach's replies. An item marked [reply or More] counts the replies and MORE.
- For each item, first copy into "quote" the shortest exact words that decide it (empty when nothing in the text does it), then answer "yes" or "no".
- Items that say what a great coach brings up: "yes" only when the reply clearly does it. A vague hint, or something close but different, is "no". Other wording with the same meaning counts, and so does a correct number written another way.
- Items that say what the coach must not do ("Does not …", "No …"): "yes" when the reply does not do it.
- Items that name a turn ("Turn 1", "Turn 2") count only that turn's reply (and MORE for the last turn).
- Judge every item on its own. Never guess which AI wrote the reply. Danish replies: judge the meaning and quote in Danish.`;

const ITEMS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, quote: { type: 'STRING' }, verdict: { type: 'STRING', enum: ['yes', 'no'] } },
        required: ['id', 'quote', 'verdict'],
        propertyOrdering: ['id', 'quote', 'verdict'],
      },
    },
  },
  required: ['items'],
};

const blind = (t: string) => t.replace(/\b(?:Gemini|Claude|Anthropic|Google AI|OpenAI|ChatGPT)\b/g, '[AI]');

/** Gemini counts its thinking inside maxOutputTokens (one 12 Nov answer spent 2,986 tokens), so it gets more room; Claude's
 * thinking room is added on top by `toClaude`, so its own limit stays small and the spend guard's worst case stays low */
export function checkBody(c: ExamCase, run: CaseRun, items: Item[], model = 'claude'): GeminiBody {
  const r = replyOf(run);
  const conv = c.turns.map((t, i) => {
    const person = t.notice ? `(no message: the coach speaks first, as a ${t.notice})` : `Person: ${t.text}${t.voice ? ' (said by voice: the reply is read aloud)' : ''}`;
    const coach = `Coach reply${c.turns.length > 1 ? ` (turn ${i + 1})` : ''}: ${blind(r.texts[i] ?? '') || '(no reply)'}`;
    return `${person}\n${coach}`;
  }).join('\n\n');
  const did = run.turns.flatMap((t) => [...(t.shown?.did ?? []).map((d) => `did: ${d.label}`), ...(t.shown?.offers ?? []).map((o) => `offered an Apply button (not tapped): ${o.label}`)]);
  const list = items.map((x) => `- ${x.id} [${x.where === 'text' ? 'visible reply' : 'reply or More'}]: ${x.text}`).join('\n');
  const text = [
    `CONVERSATION:\n${conv}`,
    `MORE (under the last reply): ${r.more ? blind(r.more) : '(none)'}`,
    `WHAT THE APP DID (from code, not from the reply's words): ${did.length ? did.join('; ') : 'nothing'}`,
    `ITEMS (answer every id, in this order):\n${list}`,
  ].join('\n\n');
  return {
    systemInstruction: { parts: [{ text: `${CHECK_SYSTEM}\n\nFACTS THE COACH HAD:\n${run.facts || '(none)'}` }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ITEMS_SCHEMA, maxOutputTokens: model.startsWith('claude-') ? 3000 : 12000 },
  };
}

/** Reads the checker's answer. A missing, doubled or unknown id, or a verdict other than yes/no, is an error (asked once more). */
export function readChecks(text: string, ids: string[]): Record<string, ItemVerdict> {
  let v: any;
  try { v = JSON.parse(text); } catch { throw new CallError(-2, `checker answer is not JSON: ${text.slice(0, 120)}`); }
  if (!Array.isArray(v?.items)) throw new CallError(-2, 'checker gave no items');
  const out: Record<string, ItemVerdict> = {};
  for (const x of v.items) {
    if (!ids.includes(x?.id)) throw new CallError(-2, `checker answered an unknown item ${x?.id}`);
    if (out[x.id]) throw new CallError(-2, `checker answered ${x.id} twice`);
    if (x.verdict !== 'yes' && x.verdict !== 'no') throw new CallError(-2, `checker gave ${x.id} the verdict ${x.verdict}`);
    out[x.id] = { verdict: x.verdict, quote: typeof x.quote === 'string' ? x.quote : '' };
  }
  const missing = ids.filter((id) => !out[id]);
  if (missing.length) throw new CallError(-2, `checker left out ${missing.join(', ')}`);
  return out;
}

/** the code items, decided here for free */
export function codeVerdicts(run: CaseRun, items: Item[]): Record<string, ItemVerdict> {
  const r = replyOf(run);
  return Object.fromEntries(items.filter((x) => x.code).map((x) => [x.id, { verdict: x.code!(r) ? 'yes' : 'no', quote: '(code)' } as ItemVerdict]));
}

/** a request is paid for once: the same checker, effort and body are reused from the saved verdicts */
export const checkKey = (model: string, effort: string, body: GeminiBody) => createHash('sha256').update(`${model}|${effort}|${JSON.stringify(body)}`).digest('hex').slice(0, 16);

export async function checkOne(model: string, c: ExamCase, run: CaseRun, items: Item[], o: CallOpts): Promise<{ verdicts: Record<string, ItemVerdict>; usd: number }> {
  const asked = items.filter((x) => !x.code);
  const body = checkBody(c, run, asked, model);
  let last: unknown;
  let usd = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = o.ledger.spent;
    try {
      const r = await call(model, body, { ...o, purpose: `catch ${c.id}`, effort: o.effort ?? 'low' });
      const text = r.candidates[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
      return { verdicts: { ...readChecks(text, asked.map((x) => x.id)), ...codeVerdicts(run, items) }, usd: usd + r.usd };
    } catch (e) {
      // a reply that could not be read was still paid for: the ledger has it, and it is counted here once
      usd += o.ledger.spent - before;
      last = e;
      if (!(e instanceof CallError) || e.status !== -2) throw e;
    }
  }
  throw last;
}

// ── scoring ──

export interface Scored { case: string; setup: string; judge: string; verdicts: Record<string, ItemVerdict> }

/**
 * Catch rate: the share of items passed. With two checkers, an item they disagree on counts half, so neither company's
 * model decides alone. Safety misses are counted apart: any one is a fail, whatever the rate.
 */
export function catchRate(items: Item[], byJudge: Record<string, ItemVerdict>[]): { points: number; of: number; safetyMisses: string[]; split: string[] } {
  let points = 0;
  const safetyMisses: string[] = [], split: string[] = [];
  for (const x of items) {
    const yes = byJudge.map((v) => v[x.id]?.verdict === 'yes');
    const share = yes.filter(Boolean).length / Math.max(yes.length, 1);
    points += share;
    if (share > 0 && share < 1) split.push(x.id);
    if (x.safety && share < 1) safetyMisses.push(x.id);
  }
  return { points, of: items.length, safetyMisses, split };
}
