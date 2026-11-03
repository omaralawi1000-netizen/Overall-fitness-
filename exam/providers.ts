/**
 * One way to call Gemini or Claude for the Coach exam, with a spend guard (E2 plan v2).
 *
 * The exam harness speaks Gemini's request shape (old Aven's Coach was built for it). `call(model, body)` sends that body
 * to Gemini as it is, or turns it into a Claude request when the model is a `claude-*` one, and always answers in
 * Gemini's response shape, so the rest of the harness does not change.
 *
 * Money: every call is priced BEFORE it is sent (a safe upper guess) and refused if it could cross the cap; the real cost
 * from the reply's token counts is then written to a ledger (one JSON line per call). A model with no price, or a price
 * past its "until" date, refuses to run: prices change, so the guard fails closed.
 *
 * Keys: never read from code. Gemini: the GEMINI_API_KEY environment variable as a header, or none when a proxy adds it.
 * Claude: AVEN_ANTHROPIC_KEY (Omar's PC) or ANTHROPIC_API_KEY. Nothing here prints a key or a header.
 */
import Anthropic from '@anthropic-ai/sdk';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

// ── prices ──
export interface Price {
  /** US dollars per million tokens */
  in: number; out: number; cacheRead: number;
  /** per web search or grounded request */
  search: number;
  /** last day this price is known to hold (YYYY-MM-DD) */
  until: string;
}
/**
 * Checked 3 Nov 2026 against the official pages (aistudio.google.com/docs/pricing; the Claude API pricing table).
 * Gemini's output price includes thinking tokens; so does Claude's (thinking is billed as output). Search fees are a safe
 * upper guess: Claude web search is $10 per 1,000; Gemini grounding is billed per grounded prompt.
 */
export const PRICES: Record<string, Price> = {
  'gemini-3.8-flash': { in: 0.75, out: 3.75, cacheRead: 0.075, search: 0.035, until: '2026-12-31' },
  'gemini-4-argon': { in: 2, out: 10, cacheRead: 0.1, search: 0.035, until: '2026-11-30' },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2, search: 0.01, until: '2026-12-31' },
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, search: 0.01, until: '2026-12-31' },
};

export class SpendCapError extends Error {}
/** status: the HTTP status; 0 = the model answered but refused or was cut off (usage then holds its bill); -1 = network; -2 = unreadable; -3 = missing. */
export class CallError extends Error { constructor(public status: number, msg: string, public usage?: Usage) { super(msg); } }

/**
 * Today by the real clock. The exam fakes Date to each conversation's "now" (Oct/Nov 2026), so the price check must not
 * read Date: performance is never faked.
 */
export const realToday = () => new Date(performance.timeOrigin + performance.now()).toISOString().slice(0, 10);

export function priceOf(model: string, today = realToday()): Price {
  const p = PRICES[model];
  if (!p) throw new SpendCapError(`no price for ${model}: add it to PRICES (checked against the official page) before running`);
  if (today > p.until) throw new SpendCapError(`the price of ${model} was checked until ${p.until}: check it again before running`);
  return p;
}

/** inTokens counts every input token, cached (read) and cache-written ones included. */
export interface Usage { inTokens: number; cachedTokens: number; outTokens: number; searches: number; cacheWriteTokens?: number }
/** Claude bills writing the 5-minute cache at 1.25× the input price (Gemini's implicit cache has no write fee). */
export const CACHE_WRITE = 1.25;
export const costOf = (p: Price, u: Usage) => {
  const w = u.cacheWriteTokens ?? 0;
  return ((u.inTokens - u.cachedTokens - w) * p.in + w * p.in * CACHE_WRITE + u.cachedTokens * p.cacheRead + u.outTokens * p.out) / 1e6 + u.searches * p.search;
};

/** A safe upper guess before a call: about 3 characters a token (real text is closer to 4), and every output token used. */
export function estimate(model: string, body: GeminiBody, maxOut: number): number {
  const chars = JSON.stringify(body.systemInstruction ?? '').length + JSON.stringify(body.contents ?? '').length + JSON.stringify(body.generationConfig?.responseSchema ?? '').length;
  const inTokens = Math.ceil(chars / 3);
  return costOf(priceOf(model), { inTokens, cachedTokens: 0, cacheWriteTokens: model.startsWith('claude-') ? inTokens : 0, outTokens: maxOut, searches: body.tools ? 3 : 0 });
}

// ── the ledger ──
export interface LedgerEntry { at: string; model: string; purpose: string; usd: number; usage: Usage; ok: boolean }
export class Ledger {
  spent = 0;
  constructor(public file: string, public capUsd: number) {
    if (!(capUsd > 0)) throw new SpendCapError('a spend cap is required');
    if (existsSync(file)) for (const line of readFileSync(file, 'utf8').split('\n')) if (line.trim()) this.spent += (JSON.parse(line) as LedgerEntry).usd;
  }
  /** Throws before a call that could cross the cap. */
  check(usd: number, what: string): void {
    if (this.spent + usd > this.capUsd) throw new SpendCapError(`stopped before ${what}: $${this.spent.toFixed(2)} spent, this call could cost up to $${usd.toFixed(3)}, cap $${this.capUsd}`);
  }
  record(e: LedgerEntry): void {
    this.spent += e.usd;
    appendFileSync(this.file, `${JSON.stringify(e)}\n`);
  }
}

// ── request and response shapes (Gemini's, as old Aven sends them) ──
export interface GeminiPart { text?: string; thought?: boolean }
export interface GeminiBody {
  systemInstruction?: { parts: GeminiPart[] };
  contents: { role: string; parts: GeminiPart[] }[];
  generationConfig?: { temperature?: number; responseMimeType?: string; responseSchema?: unknown; maxOutputTokens?: number; thinkingConfig?: { thinkingBudget?: number } };
  tools?: unknown[];
}
export interface GeminiReply {
  candidates: { content: { parts: GeminiPart[] }; groundingMetadata?: { groundingChunks: { web: { uri: string; title: string } }[] } }[];
  usage: Usage; usd: number;
}

/** Gemini's OpenAPI-style schema ("OBJECT", nullable) as the JSON Schema Claude's structured output takes. */
export function toJsonSchema(s: any): any {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== 'object') return s;
  const out: any = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'nullable' || k === 'minimum' || k === 'maximum' || k === 'minItems' || k === 'maxItems' || k === 'format' || k === 'propertyOrdering') continue;
    if (k === 'type') out.type = String(v).toLowerCase();
    else if (k === 'properties') out.properties = Object.fromEntries(Object.entries(v as object).map(([pk, pv]) => [pk, toJsonSchema(pv)]));
    else out[k] = toJsonSchema(v);
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}

/**
 * Claude's structured output takes at most 24 optional properties and 16 union-typed ones per request (official docs,
 * 3 Nov 2026); more is a 400. Old Aven's AGENT_SCHEMA has 122 optional properties, so for Claude the harness uses the
 * app's own plain-JSON mode (schema written into the system prompt), as old Aven does when a model refuses its schema.
 */
export const CLAUDE_SCHEMA_LIMITS = { optional: 24, unions: 16 };
export function schemaSize(s: any): { optional: number; unions: number } {
  let optional = 0, unions = 0;
  const walk = (x: any): void => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (Array.isArray(x.type) || x.anyOf) unions++;
    if (x.properties) {
      const req = new Set<string>(x.required ?? []);
      for (const [k, v] of Object.entries(x.properties)) { if (!req.has(k)) optional++; walk(v); }
    }
    for (const [k, v] of Object.entries(x)) if (k !== 'properties') walk(v);
  };
  walk(s);
  return { optional, unions };
}

/**
 * Where old Aven's system prompt stops being the same from call to call: look-up results, the self-check's re-ask and the
 * plain-JSON answer format are added at its end. Everything before the first of them is cached (Claude's prompt cache,
 * 5 minutes), so a conversation's second round and its second run read it at a tenth of the price.
 */
const SYSTEM_TAIL = /\n\n(?:LOOKUP RESULTS|No look-ups now|No more look-ups|ANSWER FORMAT:)/;
export function splitSystem(system: string): [string, string] {
  const i = system.search(SYSTEM_TAIL);
  return i > 0 ? [system.slice(0, i), system.slice(i)] : [system, ''];
}

/** Old Aven's Gemini request as a Claude Messages request. Exported for the offline test. */
export function toClaude(model: string, body: GeminiBody, effort: 'low' | 'medium' | 'high'): Anthropic.MessageCreateParamsNonStreaming {
  const schema = body.generationConfig?.responseSchema ? toJsonSchema(body.generationConfig.responseSchema) : null;
  if (schema) {
    const n = schemaSize(schema);
    // refused here, free, with the same 400 the API would give: the harness then switches to plain JSON mode
    if (n.optional > CLAUDE_SCHEMA_LIMITS.optional || n.unions > CLAUDE_SCHEMA_LIMITS.unions) throw new CallError(400, `schema too complex for Claude structured output (${n.optional} optional, ${n.unions} unions)`);
  }
  const text = (parts: GeminiPart[]) => parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
  const messages: Anthropic.MessageParam[] = body.contents.map((c) => ({ role: c.role === 'model' ? 'assistant' : 'user', content: text(c.parts) || '…' }));
  if (messages[0]?.role !== 'user') messages.unshift({ role: 'user', content: '…' });
  const g = body.generationConfig ?? {};
  // Claude thinks before it answers and thinking counts toward max_tokens: give it room on top of the answer's own limit
  const maxOut = (g.maxOutputTokens ?? 2048) + 6000;
  return {
    model, max_tokens: maxOut, messages,
    ...(body.systemInstruction ? { system: systemBlocks(text(body.systemInstruction.parts)) } : {}),
    // temperature is left out: Claude Sonnet 5.5 and Opus 5.5 refuse anything but the default
    output_config: { effort, ...(schema ? { format: { type: 'json_schema' as const, schema } } : {}) },
    ...(body.tools ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 } as Anthropic.WebSearchTool20260209] } : {}),
  };
}

function systemBlocks(system: string): Anthropic.TextBlockParam[] {
  const [stable, tail] = splitSystem(system);
  return [{ type: 'text', text: stable, cache_control: { type: 'ephemeral' } }, ...(tail ? [{ type: 'text' as const, text: tail }] : [])];
}

// ── the call ──
export interface CallOpts { ledger: Ledger; purpose: string; dry?: (model: string, body: GeminiBody) => GeminiReply; effort?: 'low' | 'medium' | 'high'; fetchFn?: typeof fetch; dispatcher?: unknown }

let claude: Anthropic | null = null;
const API = 'https://generativelanguage.googleapis.com/v1beta';
const maxOutOf = (model: string, body: GeminiBody) =>
  (body.generationConfig?.maxOutputTokens ?? 2048) + (model.startsWith('claude-') ? 6000 : body.generationConfig?.thinkingConfig?.thinkingBudget ?? 8192);
const entry = (model: string, purpose: string, usd: number, usage: Usage, ok: boolean): LedgerEntry => ({ at: new Date().toISOString(), model, purpose, usd, usage, ok });

export async function call(model: string, body: GeminiBody, o: CallOpts): Promise<GeminiReply> {
  const maxOut = maxOutOf(model, body);
  const price = priceOf(model);
  o.ledger.check(estimate(model, body, maxOut), `${o.purpose} on ${model}`);
  // built before a dry run too, so a schema Claude would refuse shows up (free) in the dry run
  const req = model.startsWith('claude-') ? toClaude(model, body, o.effort ?? 'medium') : null;
  if (o.dry) return o.dry(model, body);
  let reply: GeminiReply;
  try {
    reply = req ? claudeReply(await claudeClient().messages.create(req).catch(apiError), body) : geminiReply(await geminiPost(`models/${encodeURIComponent(model)}:generateContent`, body, o));
  } catch (e) {
    // a refused or cut-off Claude answer is still billed: its real token counts ride on the error
    if (e instanceof CallError && e.usage) o.ledger.record(entry(model, o.purpose, costOf(price, e.usage), e.usage, false));
    throw e;
  }
  reply.usd = costOf(price, reply.usage);
  o.ledger.record(entry(model, o.purpose, reply.usd, reply.usage, true));
  return reply;
}

function claudeClient(): Anthropic {
  const apiKey = process.env.AVEN_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new CallError(401, 'no Anthropic key in AVEN_ANTHROPIC_KEY or ANTHROPIC_API_KEY');
  return (claude ??= new Anthropic({ apiKey, maxRetries: 0, timeout: 180_000 })); // the harness does its own paced retries
}
function apiError(e: unknown): never {
  if (e instanceof Anthropic.APIError) throw new CallError(e.status ?? -1, `${e.status} ${e.message.slice(0, 200)}`);
  throw new CallError(-1, String((e as Error)?.message ?? e).slice(0, 200));
}

async function geminiPost(path: string, body: unknown, o: Pick<CallOpts, 'fetchFn' | 'dispatcher'>, method = 'POST'): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.GEMINI_API_KEY) headers['x-goog-api-key'] = process.env.GEMINI_API_KEY;
  const f = o.fetchFn ?? fetch;
  const res: any = await f(`${API}/${path}`, { method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), ...(o.dispatcher ? { dispatcher: o.dispatcher } : {}), signal: AbortSignal.timeout(120_000) } as RequestInit);
  const data: any = await res.json().catch(() => null);
  if (res.status !== 200) throw new CallError(res.status, `${res.status} ${String(data?.error?.message ?? '').slice(0, 200)}`);
  return data;
}
function geminiReply(data: any): GeminiReply {
  const m = data?.usageMetadata ?? {};
  const grounded = (data?.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? []).length;
  return { candidates: data?.candidates ?? [], usage: { inTokens: m.promptTokenCount ?? 0, cachedTokens: m.cachedContentTokenCount ?? 0, outTokens: (m.candidatesTokenCount ?? 0) + (m.thoughtsTokenCount ?? 0), searches: grounded ? 1 : 0 }, usd: 0 };
}

/**
 * Plain JSON mode: Gemini's responseMimeType forces bare JSON, Claude has no such switch and may wrap the object in a
 * ```json fence or a sentence. Keep the outermost object (or the text as it was, so a real failure still shows).
 */
export function jsonOnly(t: string): string {
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

/** A Claude message in Gemini's reply shape. A refusal or a cut-off answer is an error that still carries its bill. */
export function claudeReply(msg: Anthropic.Message, body: GeminiBody): GeminiReply {
  const u = msg.usage;
  const usage: Usage = { inTokens: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), cachedTokens: u.cache_read_input_tokens ?? 0, cacheWriteTokens: u.cache_creation_input_tokens ?? 0, outTokens: u.output_tokens, searches: u.server_tool_use?.web_search_requests ?? 0 };
  if (msg.stop_reason === 'refusal') throw new CallError(0, `refusal${msg.stop_details && 'category' in msg.stop_details ? ` (${msg.stop_details.category})` : ''}`, usage);
  if (msg.stop_reason === 'max_tokens') throw new CallError(0, 'cut off at max_tokens', usage);
  const all = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
  const plainJson = body.generationConfig?.responseMimeType === 'application/json' && !body.generationConfig?.responseSchema;
  const text = plainJson ? jsonOnly(all) : all;
  const chunks = msg.content.flatMap((b: any) => (b.type === 'web_search_tool_result' && Array.isArray(b.content) ? b.content : []))
    .map((r: any) => ({ web: { uri: String(r.url), title: String(r.title ?? 'source') } }));
  return { candidates: [{ content: { parts: [{ text }] }, ...(chunks.length ? { groundingMetadata: { groundingChunks: chunks } } : {}) }], usage, usd: 0 };
}

// ── batches (the judges): half price, answers within minutes to hours ──
/** Both batch APIs bill half the normal price (official pricing pages, 3 Nov 2026). */
export const BATCH_DISCOUNT = 0.5;
export interface BatchOpts extends CallOpts { pollMs?: number; maxWaitMs?: number; onPoll?: (state: string) => void; sleep?: (ms: number) => Promise<void>; /** for the offline test */ client?: Pick<Anthropic, 'messages'> }
export type BatchResult = Map<string, GeminiReply | CallError>;

/**
 * Sends every request as one batch and waits for all answers. The whole batch's worst case is checked against the cap
 * first; each answer's real (discounted) cost is then written to the ledger. An answer that failed is a CallError in the
 * map (the caller decides to retry it), never a guess.
 */
export async function callBatch(model: string, items: { id: string; body: GeminiBody }[], o: BatchOpts): Promise<BatchResult> {
  const price = priceOf(model);
  if (new Set(items.map((x) => x.id)).size !== items.length) throw new Error('batch ids must be unique');
  const worst = items.reduce((s, x) => s + estimate(model, x.body, maxOutOf(model, x.body)), 0) * BATCH_DISCOUNT;
  o.ledger.check(worst, `${o.purpose}: a batch of ${items.length} on ${model}`);
  const out: BatchResult = new Map();
  const isClaude = model.startsWith('claude-');
  const reqs = items.map((x) => ({ ...x, req: isClaude ? toClaude(model, x.body, o.effort ?? 'medium') : null }));
  if (o.dry) { for (const x of items) out.set(x.id, o.dry(model, x.body)); return out; }
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const deadline = Date.now() + (o.maxWaitMs ?? 6 * 3600_000);
  const keep = (id: string, read: () => GeminiReply) => {
    try {
      const r = read();
      r.usd = costOf(price, r.usage) * BATCH_DISCOUNT;
      o.ledger.record(entry(model, `${o.purpose} ${id}`, r.usd, r.usage, true));
      out.set(id, r);
    } catch (e) {
      const err = e instanceof CallError ? e : new CallError(-1, String((e as Error)?.message ?? e));
      if (err.usage) o.ledger.record(entry(model, `${o.purpose} ${id}`, costOf(price, err.usage) * BATCH_DISCOUNT, err.usage, false));
      out.set(id, err);
    }
  };
  const bodyOf = new Map(items.map((x) => [x.id, x.body]));

  if (isClaude) {
    const c = o.client ?? claudeClient();
    const batch = await c.messages.batches.create({ requests: reqs.map((x) => ({ custom_id: x.id, params: x.req! })) }).catch(apiError);
    for (let b = batch; b.processing_status !== 'ended'; b = await c.messages.batches.retrieve(batch.id).catch(apiError)) {
      if (Date.now() > deadline) throw new CallError(-1, `batch ${batch.id} still running after the wait limit: it keeps running at Anthropic; collect it later`);
      o.onPoll?.(`${b.processing_status}: ${b.request_counts.succeeded + b.request_counts.errored} of ${items.length} done`);
      await sleep(o.pollMs ?? 30_000);
    }
    for await (const r of await c.messages.batches.results(batch.id).catch(apiError)) {
      const body = bodyOf.get(r.custom_id);
      if (!body) continue;
      if (r.result.type === 'succeeded') { const msg = r.result.message; keep(r.custom_id, () => claudeReply(msg, body)); }
      else out.set(r.custom_id, new CallError(r.result.type === 'errored' ? -1 : -3, `batch item ${r.result.type}${r.result.type === 'errored' ? `: ${JSON.stringify(r.result.error).slice(0, 160)}` : ''}`));
    }
  } else {
    const created = await geminiPost(`models/${encodeURIComponent(model)}:batchGenerateContent`, {
      batch: { display_name: o.purpose.slice(0, 100), input_config: { requests: { requests: items.map((x) => ({ request: x.body, metadata: { key: x.id } })) } } },
    }, o);
    const name: string = created?.name;
    if (!name) throw new CallError(-1, 'Gemini batch: no job name in the reply');
    let job = created;
    for (;;) {
      const state = String(job?.metadata?.state ?? job?.state ?? '');
      if (job?.done || /(SUCCEEDED|FAILED|CANCELLED|EXPIRED)$/.test(state)) break;
      if (Date.now() > deadline) throw new CallError(-1, `Gemini batch ${name} still running after the wait limit: collect it later`);
      o.onPoll?.(state || 'pending');
      await sleep(o.pollMs ?? 30_000);
      job = await geminiPost(name, null, o, 'GET');
    }
    const state = String(job?.metadata?.state ?? job?.state ?? '');
    if (!/SUCCEEDED$/.test(state) && !job?.response) throw new CallError(-1, `Gemini batch ${name} ended as ${state || 'unknown'}: ${JSON.stringify(job?.error ?? '').slice(0, 160)}`);
    const list = geminiInlined(job);
    if (!list) throw new CallError(-1, `Gemini batch ${name}: no inline answers found (keys: ${Object.keys(job?.response ?? job ?? {}).join(', ')})`);
    list.forEach((r: any, i: number) => {
      // matched by our key when the answer carries it, else by position (inline answers come back in request order)
      const id = r?.metadata?.key ?? r?.key ?? items[i]?.id;
      const body = bodyOf.get(id);
      if (!body) return;
      if (r?.error || !r?.response) out.set(id, new CallError(Number(r?.error?.code) || -1, `batch item failed: ${JSON.stringify(r?.error ?? 'no response').slice(0, 160)}`));
      else keep(id, () => geminiReply(r.response));
    });
  }
  for (const x of items) if (!out.has(x.id)) out.set(x.id, new CallError(-3, 'no answer for this item in the batch results'));
  return out;
}

/** Google's docs show the inline answers at more than one path; accept each, and unwrap one level of nesting. */
export function geminiInlined(job: any): any[] | null {
  for (const c of [job?.response?.inlinedResponses, job?.dest?.inlinedResponses, job?.metadata?.output?.inlinedResponses, job?.response?.dest?.inlinedResponses, job?.output?.inlinedResponses]) {
    if (Array.isArray(c)) return c;
    if (Array.isArray(c?.inlinedResponses)) return c.inlinedResponses;
  }
  return null;
}
