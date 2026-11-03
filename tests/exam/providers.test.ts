// The exam's model layer, offline: the spend guard fails closed, and old Aven's Gemini request turns into a valid Claude one.
import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { priceOf, realToday, costOf, estimate, Ledger, SpendCapError, CallError, toJsonSchema, toClaude, schemaSize, jsonOnly, splitSystem, callBatch, geminiInlined, call, PRICES, type GeminiBody, type GeminiReply } from '../../exam/providers';

const cid = (x: string) => createHash('sha256').update(x).digest('hex').slice(0, 32);
const tmp = () => join(mkdtempSync(join(tmpdir(), 'ledger-')), 'ledger.jsonl');
const BODY: GeminiBody = {
  systemInstruction: { parts: [{ text: 'You are the Coach.' }] },
  contents: [{ role: 'model', parts: [{ text: 'Hi' }] }, { role: 'user', parts: [{ text: 'thinking', thought: true }, { text: 'log 2 eggs' }] }],
  generationConfig: { temperature: 0.3, responseMimeType: 'application/json', maxOutputTokens: 6144, thinkingConfig: { thinkingBudget: 1024 },
    responseSchema: { type: 'OBJECT', properties: {
      reply: { type: 'STRING' },
      actions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        type: { type: 'STRING', enum: ['log_food', 'set_setting'] },
        kg: { type: 'NUMBER', nullable: true, minimum: 0 },
        goal: { type: 'OBJECT', nullable: true, properties: { metric: { type: 'STRING', enum: ['weight', 'lift'] } }, required: ['metric'] },
      }, required: ['type'] } },
    }, required: ['reply', 'actions'] } },
};
const fake = (text = '{"reply":"ok","actions":[]}'): GeminiReply => ({ candidates: [{ content: { parts: [{ text }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0 });

describe('prices fail closed', () => {
  it('refuses a model with no price', () => expect(() => priceOf('gemini-9-mystery')).toThrow(SpendCapError));
  it('refuses a price past its checked date', () => expect(() => priceOf('gemini-4-argon', '2026-12-01')).toThrow(/check it again/));
  it('accepts a price on its last day', () => expect(priceOf('gemini-4-argon', '2026-11-30').in).toBe(2));
  it('checks the date by the real clock, not the faked conversation date (Codex, PR #66)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 1));
    PRICES['test-expired'] = { in: 1, out: 1, cacheRead: 0.1, search: 0, until: '2026-10-15' };
    try {
      expect(new Date().toISOString().slice(0, 7)).toBe('2026-10');
      expect(realToday() > '2026-10-15').toBe(true);
      expect(() => priceOf('test-expired')).toThrow(/check it again/);
    } finally { delete PRICES['test-expired']; vi.useRealTimers(); }
  });
  it('prices cached tokens at the cache rate', () => {
    const p = PRICES['claude-sonnet-5-5'];
    expect(costOf(p, { inTokens: 1e6, cachedTokens: 0, outTokens: 1e6, searches: 0 })).toBeCloseTo(12);
    expect(costOf(p, { inTokens: 1e6, cachedTokens: 1e6, outTokens: 0, searches: 0 })).toBeCloseTo(0.2);
    expect(costOf(p, { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 2 })).toBeCloseTo(0.02);
    expect(costOf(p, { inTokens: 1e6, cachedTokens: 0, cacheWriteTokens: 1e6, outTokens: 0, searches: 0 })).toBeCloseTo(2.5);
  });
  it('the guess before a call counts every output token and is never below the real price of the input', () => {
    const chars = JSON.stringify(BODY.systemInstruction).length + JSON.stringify(BODY.contents).length + JSON.stringify(BODY.generationConfig?.responseSchema).length;
    expect(estimate('claude-opus-5-5', BODY, 1000)).toBeCloseTo((Math.ceil(chars / 3) * 4 * 1.25 + 1000 * 20) / 1e6); // Claude: as if all of it were a cache write
    expect(estimate('gemini-3.8-flash', BODY, 1000)).toBeCloseTo((Math.ceil(chars / 3) * 0.75 + 1000 * 3.75) / 1e6);
  });
});

describe('ledger', () => {
  it('needs a cap', () => expect(() => new Ledger(tmp(), 0)).toThrow(SpendCapError));
  it('stops a call that could cross the cap, and remembers spend across runs', () => {
    const f = tmp();
    const a = new Ledger(f, 1);
    a.record({ at: 'x', model: 'm', purpose: 'p', usd: 0.7, usage: { inTokens: 1, cachedTokens: 0, outTokens: 1, searches: 0 }, ok: true });
    expect(() => a.check(0.3, 'q')).not.toThrow();
    expect(() => a.check(0.31, 'q')).toThrow(/stopped before q/);
    const b = new Ledger(f, 1); // a second run reads what the first one spent
    expect(b.spent).toBeCloseTo(0.7);
  });
  it('a call is refused before it is sent, even in a dry run', async () => {
    const f = tmp();
    writeFileSync(f, `${JSON.stringify({ usd: 0.999 })}\n`);
    let sent = false;
    await expect(call('gemini-3.8-flash', BODY, { ledger: new Ledger(f, 1), purpose: 'q1', dry: () => { sent = true; return fake(); } })).rejects.toThrow(SpendCapError);
    expect(sent).toBe(false);
  });
  it('a dry run returns the fake reply and spends nothing', async () => {
    const l = new Ledger(tmp(), 1);
    expect((await call('claude-sonnet-5-5', BODY, { ledger: l, purpose: 'q1', dry: () => fake() })).candidates[0].content.parts[0].text).toContain('ok');
    expect(l.spent).toBe(0);
  });
  it('a Gemini reply is priced from its own token counts, thinking included', async () => {
    const l = new Ledger(tmp(), 5);
    const fetchFn = (async () => ({ status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 } }) })) as unknown as typeof fetch;
    const r = await call('gemini-3.8-flash', BODY, { ledger: l, purpose: 'q1', fetchFn });
    expect(r.usage).toEqual({ inTokens: 1000, cachedTokens: 0, outTokens: 1000, searches: 0 });
    expect(r.usd).toBeCloseTo((1000 * 0.75 + 1000 * 3.75) / 1e6);
    expect(l.spent).toBeCloseTo(r.usd);
  });
  it('a Gemini error is thrown with its status and costs nothing', async () => {
    const l = new Ledger(tmp(), 5);
    const fetchFn = (async () => ({ status: 429, json: async () => ({ error: { message: 'quota' } }) })) as unknown as typeof fetch;
    await expect(call('gemini-3.8-flash', BODY, { ledger: l, purpose: 'q1', fetchFn })).rejects.toMatchObject({ status: 429 });
    expect(l.spent).toBe(0);
  });
});

describe('Gemini schema → JSON Schema for Claude', () => {
  const s = toJsonSchema(BODY.generationConfig!.responseSchema);
  it('lowercases types, drops nullable and number limits, closes every object', () => {
    const walk = (x: any): void => {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) return x.forEach(walk);
      expect(x).not.toHaveProperty('nullable');
      expect(x).not.toHaveProperty('minimum');
      if (typeof x.type === 'string') expect(x.type).toBe(x.type.toLowerCase());
      if (x.type === 'object') expect(x.additionalProperties).toBe(false);
      Object.values(x).forEach(walk);
    };
    walk(s);
    expect(s.required).toEqual(['reply', 'actions']);
    expect(s.properties.actions.items.properties.type.enum).toEqual(['log_food', 'set_setting']);
  });
  it('a property called "type" or "properties" inside properties is kept as a property', () => {
    expect(s.properties.actions.items.properties.type.type).toBe('string');
    expect(toJsonSchema({ type: 'OBJECT', properties: { properties: { type: 'STRING' } } }).properties.properties).toEqual({ type: 'string' });
  });
});

describe('Gemini request → Claude request', () => {
  const r = toClaude('claude-sonnet-5-5', BODY, 'medium');
  it('starts with a user turn, maps model → assistant and leaves out thoughts', () => {
    expect(r.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(r.messages[2].content).toBe('log 2 eggs');
  });
  it('sends no temperature or thinking budget (5.5 models refuse them), effort and the schema instead', () => {
    expect(r).not.toHaveProperty('temperature');
    expect(r).not.toHaveProperty('thinking');
    expect(r.system).toEqual([{ type: 'text', text: 'You are the Coach.', cache_control: { type: 'ephemeral' } }]);
    expect(r.output_config?.effort).toBe('medium');
    expect((r.output_config?.format as any).schema.type).toBe('object');
    expect(r.max_tokens).toBe(6144 + 6000);
  });
  it('caches the part of the system prompt that stays the same between rounds and runs', () => {
    const base = 'You are the Coach.\nMEMORY: x\nDATA: y';
    expect(splitSystem(base)).toEqual([base, '']);
    for (const tail of ['\n\nLOOKUP RESULTS (…):\nfoo', '\n\nNo look-ups now: answer.', '\n\nANSWER FORMAT: only a JSON object', '\n\nLOOKUP RESULTS: a\n\nANSWER FORMAT: b'])
      expect(splitSystem(base + tail)).toEqual([base, tail]);
    const r2 = toClaude('claude-sonnet-5-5', { ...BODY, systemInstruction: { parts: [{ text: `${base}\n\nANSWER FORMAT: z` }] } }, 'low');
    expect(r2.system).toEqual([{ type: 'text', text: base, cache_control: { type: 'ephemeral' } }, { type: 'text', text: '\n\nANSWER FORMAT: z' }]);
  });
  it('turns Google search grounding into Claude web search', () => {
    expect(toClaude('claude-opus-5-5', { ...BODY, tools: [{ google_search: {} }] }, 'high').tools?.[0]).toMatchObject({ type: 'web_search_20260209', name: 'web_search' });
  });
  it('a schema over Claude\'s limits is refused here with a 400, free, even in a dry run (the harness then uses plain JSON)', async () => {
    const big = { type: 'OBJECT', properties: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`p${i}`, { type: 'STRING', nullable: true }])) };
    expect(schemaSize(toJsonSchema(big))).toEqual({ optional: 25, unions: 0 });
    expect(schemaSize(toJsonSchema(BODY.generationConfig!.responseSchema))).toEqual({ optional: 2, unions: 0 });
    const body = { ...BODY, generationConfig: { ...BODY.generationConfig, responseSchema: big } };
    expect(() => toClaude('claude-sonnet-5-5', body, 'medium')).toThrow(CallError);
    const l = new Ledger(tmp(), 5);
    await expect(call('claude-sonnet-5-5', body, { ledger: l, purpose: 'q1', dry: () => fake() })).rejects.toMatchObject({ status: 400 });
    expect(l.spent).toBe(0);
    // plain JSON mode (no schema) goes through
    const { responseSchema: _, ...plain } = body.generationConfig;
    expect(toClaude('claude-sonnet-5-5', { ...body, generationConfig: plain }, 'medium').output_config?.format).toBeUndefined();
  });
  it('plain JSON mode keeps only the object when Claude wraps it', () => {
    expect(jsonOnly('```json\n{"reply":"hi","actions":[]}\n```')).toBe('{"reply":"hi","actions":[]}');
    expect(jsonOnly('Sure: {"a":{"b":1}} done')).toBe('{"a":{"b":1}}');
    expect(jsonOnly('no json here')).toBe('no json here');
  });
  it('without a key it stops before sending anything', async () => {
    const saved = [process.env.AVEN_ANTHROPIC_KEY, process.env.ANTHROPIC_API_KEY];
    delete process.env.AVEN_ANTHROPIC_KEY; delete process.env.ANTHROPIC_API_KEY;
    try {
      const l = new Ledger(tmp(), 5);
      await expect(call('claude-sonnet-5-5', BODY, { ledger: l, purpose: 'q1' })).rejects.toMatchObject({ status: 401 });
      expect(l.spent).toBe(0);
    } finally {
      if (saved[0] !== undefined) process.env.AVEN_ANTHROPIC_KEY = saved[0];
      if (saved[1] !== undefined) process.env.ANTHROPIC_API_KEY = saved[1];
    }
  });
});

describe('a paused Claude web search (Codex, PR #66)', () => {
  const usage = { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: { web_search_requests: 1 } };
  const SEARCH: GeminiBody = { contents: [{ role: 'user', parts: [{ text: 'creatine on a cut' }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: 1400 } };
  it('sends the paused content back unchanged until the turn ends, and bills every page', async () => {
    const seen: any[] = [];
    const pages = [
      { content: [{ type: 'text', text: 'I will look up the latest evidence.' }, { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'creatine' } }], stop_reason: 'pause_turn', usage },
      { content: [{ type: 'text', text: 'Creatine at 3–5 g a day is safe on a cut.' }], stop_reason: 'end_turn', usage },
    ];
    const client = { messages: { create: async (r: any) => { seen.push(structuredClone(r.messages)); return pages.shift(); } } } as any;
    const l = new Ledger(tmp(), 5);
    const r = await call('claude-sonnet-5-5', SEARCH, { ledger: l, purpose: 'web', client });
    expect(r.candidates[0].content.parts[0].text).toBe('Creatine at 3–5 g a day is safe on a cut.');
    expect(seen[1].at(-1)).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'I will look up the latest evidence.' }, { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'creatine' } }] });
    const page = (1000 * 2 + 100 * 10) / 1e6 + 0.01;
    expect(l.spent).toBeCloseTo(2 * page);
    expect(r.usd).toBeCloseTo(2 * page);
  });
  it('a turn still paused after 3 continuations is an error, never an answer', async () => {
    let n = 0;
    const client = { messages: { create: async () => { n++; return { content: [{ type: 'text', text: 'still searching' }], stop_reason: 'pause_turn', usage }; } } } as any;
    await expect(call('claude-sonnet-5-5', SEARCH, { ledger: new Ledger(tmp(), 5), purpose: 'web', client })).rejects.toThrow(/still paused/);
    expect(n).toBe(4);
  });
});

describe('batches (judges, half price)', () => {
  const items = [{ id: 'a', body: BODY }, { id: 'b', body: BODY }];
  const gem = (text: string, inT = 1000, outT = 500) => ({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: inT, candidatesTokenCount: outT } });
  const fakeFetch = (pages: any[]) => {
    const seen: string[] = [];
    const f = (async (url: string, init: any) => { seen.push(`${init.method} ${url.split('/v1beta/')[1]}`); return { status: 200, json: async () => pages.shift() }; }) as unknown as typeof fetch;
    return { f, seen };
  };
  const quick = { sleep: async () => {}, pollMs: 1 };

  it('Gemini: creates the job, polls it, matches answers by key, prices them at half', async () => {
    const { f, seen } = fakeFetch([
      { name: 'batches/1', metadata: { state: 'JOB_STATE_PENDING' } },
      { name: 'batches/1', metadata: { state: 'JOB_STATE_RUNNING' } },
      { name: 'batches/1', done: true, metadata: { state: 'JOB_STATE_SUCCEEDED' }, response: { inlinedResponses: { inlinedResponses: [{ metadata: { key: 'b' }, response: gem('B') }, { metadata: { key: 'a' }, response: gem('A') }] } } },
    ]);
    const l = new Ledger(tmp(), 5);
    const out = await callBatch('gemini-4-argon', items, { ledger: l, purpose: 'judge', fetchFn: f, ...quick });
    expect(seen).toEqual(['POST models/gemini-4-argon:batchGenerateContent', 'GET batches/1', 'GET batches/1']);
    expect((out.get('a') as GeminiReply).candidates[0].content.parts[0].text).toBe('A');
    expect((out.get('b') as GeminiReply).usd).toBeCloseTo(((1000 * 2 + 500 * 10) / 1e6) * 0.5);
    expect(l.spent).toBeCloseTo(2 * ((1000 * 2 + 500 * 10) / 1e6) * 0.5);
  });
  it('Gemini: answers without keys are matched by position; a failed item is an error, not a guess', async () => {
    const { f } = fakeFetch([{ name: 'batches/2', done: true, state: 'BATCH_STATE_SUCCEEDED', dest: { inlinedResponses: [{ response: gem('A') }, { error: { code: 500, message: 'x' } }] } }]);
    const out = await callBatch('gemini-3.8-flash', items, { ledger: new Ledger(tmp(), 5), purpose: 'p', fetchFn: f, ...quick });
    expect((out.get('a') as GeminiReply).candidates[0].content.parts[0].text).toBe('A');
    expect(out.get('b')).toBeInstanceOf(CallError);
  });
  it('Gemini: a failed job throws', async () => {
    const { f } = fakeFetch([{ name: 'batches/3', metadata: { state: 'JOB_STATE_FAILED' }, error: { message: 'bad' } }]);
    await expect(callBatch('gemini-3.8-flash', items, { ledger: new Ledger(tmp(), 5), purpose: 'p', fetchFn: f, ...quick })).rejects.toThrow(/FAILED/);
  });
  it('the whole batch is checked against the cap before it is sent', async () => {
    const { f, seen } = fakeFetch([]);
    const big = Array.from({ length: 400 }, (_, i) => ({ id: `x${i}`, body: BODY }));
    await expect(callBatch('claude-opus-5-5', big, { ledger: new Ledger(tmp(), 1), purpose: 'p', fetchFn: f, ...quick })).rejects.toThrow(SpendCapError);
    expect(seen).toEqual([]);
  });
  it('Claude: one batch, polled until it ends; a refusal is billed and kept as an error', async () => {
    const usage = { input_tokens: 800, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    const msg = (text: string, stop = 'end_turn') => ({ content: [{ type: 'text', text }], stop_reason: stop, stop_details: null, usage });
    let polls = 0; let sent: any = null;
    const client = { messages: { batches: {
      create: async (p: any) => { sent = p; return { id: 'mb1', processing_status: 'in_progress', request_counts: { succeeded: 0, errored: 0 } }; },
      retrieve: async () => ({ id: 'mb1', processing_status: ++polls < 2 ? 'in_progress' : 'ended', request_counts: { succeeded: 1, errored: 0 } }),
      results: async () => (async function* () {
        yield { custom_id: cid('a'), result: { type: 'succeeded', message: msg('{"ok":1}') } };
        yield { custom_id: cid('b'), result: { type: 'succeeded', message: msg('', 'refusal') } };
      })(),
    } } } as any;
    const l = new Ledger(tmp(), 5);
    const out = await callBatch('claude-opus-5-5', items, { ledger: l, purpose: 'judge', client, ...quick });
    // (Anthropic takes only ^[a-zA-Z0-9_-]{1,64}$ as a custom_id; answers are mapped back to our ids)
    expect(sent.requests.map((r: any) => r.custom_id)).toEqual([cid('a'), cid('b')]);
    for (const r of sent.requests) expect(r.custom_id).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
    expect(sent.requests[0].params.model).toBe('claude-opus-5-5');
    expect((out.get('a') as GeminiReply).candidates[0].content.parts[0].text).toBe('{"ok":1}');
    expect(out.get('b')).toMatchObject({ status: 0 });
    const one = ((800 * 4 + 300 * 20) / 1e6) * 0.5;
    expect(l.spent).toBeCloseTo(2 * one); // the refusal's tokens are billed too
  });
  describe('a batch that outlives its run (Codex, PR #66)', () => {
    const usage = { input_tokens: 800, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    const msg = (text: string) => ({ content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_details: null, usage });
    const one = ((800 * 4 + 300 * 20) / 1e6) * 0.5;
    const results = async () => (async function* () { for (const id of ['a', 'b']) yield { custom_id: cid(id), result: { type: 'succeeded', message: msg(`{"${id}":1}`) } }; })();
    it('Claude: a stopped run keeps the handle and the reservation; the next run collects the same batch instead of sending it again', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'jobs-'));
      const file = tmp();
      let created = 0;
      const down = { messages: { batches: { create: async () => { created++; return { id: 'mb9', processing_status: 'in_progress', request_counts: { succeeded: 0, errored: 0 } }; }, retrieve: async () => { throw new Error('socket hang up'); }, results } } } as any;
      await expect(callBatch('claude-opus-5-5', items, { ledger: new Ledger(file, 5), purpose: 'judge', client: down, jobDir: dir, ...quick, maxWaitMs: -1 })).rejects.toThrow(/run again to collect it/);
      expect(created).toBe(1);
      expect(readdirSync(dir)).toHaveLength(1);
      const held = new Ledger(file, 5).spent;
      expect(held).toBeGreaterThan(2 * one); // the worst case stays counted while the batch is out
      const up = { messages: { batches: { create: async () => { created++; throw new Error('must not send again'); }, retrieve: async () => ({ id: 'mb9', processing_status: 'ended', request_counts: { succeeded: 2, errored: 0 } }), results } } } as any;
      const l = new Ledger(file, 5);
      const out = await callBatch('claude-opus-5-5', items, { ledger: l, purpose: 'judge', client: up, jobDir: dir, ...quick });
      expect(created).toBe(1);
      expect((out.get('b') as GeminiReply).candidates[0].content.parts[0].text).toBe('{"b":1}');
      expect(l.spent).toBeCloseTo(2 * one); // reservation given back, only the real cost stays
      expect(readdirSync(dir)).toEqual([]);
    });
    it('Claude: an answer read again after a broken download is billed once (Codex, PR #66)', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'jobs-'));
      const file = tmp();
      const broken = async () => (async function* () { yield { custom_id: cid('a'), result: { type: 'succeeded', message: msg('{"a":1}') } }; throw new Error('stream reset'); })();
      const c1 = { messages: { batches: { create: async () => ({ id: 'mb7', processing_status: 'ended', request_counts: { succeeded: 2, errored: 0 } }), retrieve: async () => ({ id: 'mb7', processing_status: 'ended', request_counts: { succeeded: 2, errored: 0 } }), results: broken } } } as any;
      await expect(callBatch('claude-opus-5-5', items, { ledger: new Ledger(file, 5), purpose: 'judge', client: c1, jobDir: dir, ...quick })).rejects.toThrow(/stream reset/);
      const c2 = { messages: { batches: { ...c1.messages.batches, create: async () => { throw new Error('must not send again'); }, results } } } as any;
      const l = new Ledger(file, 5);
      await callBatch('claude-opus-5-5', items, { ledger: l, purpose: 'judge', client: c2, jobDir: dir, ...quick });
      expect(l.spent).toBeCloseTo(2 * one);
      // and a third read of the ledger (another run) agrees
      expect(new Ledger(file, 5).spent).toBeCloseTo(2 * one);
    });
    it('Claude: a poll that fails on the network is tried again', async () => {
      let polls = 0;
      const flaky = { messages: { batches: { create: async () => ({ id: 'mb8', processing_status: 'in_progress', request_counts: { succeeded: 0, errored: 0 } }), retrieve: async () => { if (++polls === 1) throw new Error('ECONNRESET'); return { id: 'mb8', processing_status: 'ended', request_counts: { succeeded: 2, errored: 0 } }; }, results } } } as any;
      const out = await callBatch('claude-opus-5-5', items, { ledger: new Ledger(tmp(), 5), purpose: 'judge', client: flaky, ...quick });
      expect(polls).toBe(2);
      expect(out.get('a')).not.toBeInstanceOf(CallError);
    });
    it('Gemini: the next run polls the saved job, never posts a second one', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'jobs-'));
      const file = tmp();
      const seen: string[] = [];
      const pages: [number, any][] = [[200, { name: 'batches/7', metadata: { state: 'JOB_STATE_PENDING' } }], [400, { error: { message: 'stop' } }],
        [200, { name: 'batches/7', done: true, metadata: { state: 'JOB_STATE_SUCCEEDED' }, response: { inlinedResponses: [{ metadata: { key: 'a' }, response: gem('A') }, { metadata: { key: 'b' }, response: gem('B') }] } }]];
      const f = (async (url: string, init: any) => { seen.push(`${init.method} ${url.split('/v1beta/')[1]}`); const [status, body] = pages.shift()!; return { status, json: async () => body }; }) as unknown as typeof fetch;
      await expect(callBatch('gemini-4-argon', items, { ledger: new Ledger(file, 5), purpose: 'judge', fetchFn: f, jobDir: dir, ...quick })).rejects.toMatchObject({ status: 400 });
      const l = new Ledger(file, 5);
      const out = await callBatch('gemini-4-argon', items, { ledger: l, purpose: 'judge', fetchFn: f, jobDir: dir, ...quick });
      expect(seen).toEqual(['POST models/gemini-4-argon:batchGenerateContent', 'GET batches/7', 'GET batches/7']);
      expect((out.get('a') as GeminiReply).candidates[0].content.parts[0].text).toBe('A');
      expect(l.spent).toBeCloseTo(2 * ((1000 * 2 + 500 * 10) / 1e6) * 0.5);
      expect(readdirSync(dir)).toEqual([]);
    });
  });
  it('the inline answers are found at each path Google documents', () => {
    expect(geminiInlined({ response: { inlinedResponses: [1] } })).toEqual([1]);
    expect(geminiInlined({ response: { inlinedResponses: { inlinedResponses: [2] } } })).toEqual([2]);
    expect(geminiInlined({ dest: { inlinedResponses: [3] } })).toEqual([3]);
    expect(geminiInlined({ response: {} })).toBeNull();
  });
});
