import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coachRequest } from '../../src/coach/coach';
import { buildFacts } from '../../src/coach/facts';
import { askCoach, GEMINI_THINKING, toBody } from '../../exam/v2/ask-coach';
import { Ledger, toClaude, type GeminiBody } from '../../exam/providers';

const sheet = buildFacts([], { now: Date.UTC(2026, 10, 3, 12), tz: 'Europe/Copenhagen' });
const req = coachRequest(sheet, [{ role: 'person', text: 'log 500 ml water' }]);
const ledger = () => new Ledger(join(mkdtempSync(join(tmpdir(), 'ask-')), 'l.jsonl'), 1);
const dry = (text: string) => () => ({ candidates: [{ content: { parts: [{ text }] } }], usage: { inTokens: 10, cachedTokens: 0, outTokens: 5, searches: 0 }, usd: 0 });

describe('one request for every model', () => {
  it('Gemini gets upper-case schema types; Claude gets the same schema as JSON Schema, within its limits', () => {
    const b = toBody(req);
    expect((b.generationConfig!.responseSchema as { type: string }).type).toBe('OBJECT');
    expect(b.systemInstruction!.parts[0].text).toContain('FACTS');
    const c = toClaude('claude-sonnet-5-5', b as GeminiBody, 'medium');
    expect((c.output_config as unknown as { format: { schema: { type: string } } }).format.schema.type).toBe('object');
  });

  it('reads a good reply and reports a broken one without throwing', async () => {
    const ok = await askCoach('gemini-3.8-flash', req, { ledger: ledger(), purpose: 't', dry: dry('{"say":"Logged.","actions":[{"how":"do","name":"log_water","ml":500}]}') });
    expect(ok.reply).toEqual({ say: 'Logged.', actions: [{ how: 'do', name: 'log_water', ml: 500 }] });
    const bad = await askCoach('gemini-3.8-flash', req, { ledger: ledger(), purpose: 't', dry: dry('Sure! I logged it.') });
    expect(bad.error).toBe('reply is not JSON');
  });

  it('asks again when the model is busy, and marks a refused call as no answer', async () => {
    const reply = { candidates: [{ content: { parts: [{ text: '{"say":"Hi.","actions":[]}' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } };
    const answers = [{ status: 503, body: { error: { message: 'busy' } } }, { status: 429, body: { error: { message: 'slow down' } } }, { status: 200, body: reply }];
    const waits: number[] = [];
    const fetchFn = (async () => { const a = answers.shift()!; return { status: a.status, json: async () => a.body }; }) as unknown as typeof fetch;
    const ok = await askCoach('gemini-3.8-flash', req, { ledger: ledger(), purpose: 't', fetchFn, wait: async (ms) => { waits.push(ms); } });
    expect(ok.reply?.say).toBe('Hi.');
    expect(waits).toHaveLength(2);
    const refused = (async () => ({ status: 400, json: async () => ({ error: { message: 'bad request' } }) })) as unknown as typeof fetch;
    const no = await askCoach('gemini-3.8-flash', req, { ledger: ledger(), purpose: 't', fetchFn: refused, wait: async () => { throw new Error('a 400 is never retried'); } });
    expect(no).toMatchObject({ callFailed: true });
    expect(no.reply).toBeUndefined();
  });

  it('gives Gemini thinking room on top of the answer, and names a reply cut off at the limit', async () => {
    const g = toBody(req, 1200, 'gemini-3.8-flash').generationConfig!;
    expect(g.maxOutputTokens).toBe(1200 + GEMINI_THINKING);
    expect(g.thinkingConfig?.thinkingBudget).toBe(GEMINI_THINKING);
    const c = toBody(req, 1200, 'claude-sonnet-5-5').generationConfig!;
    expect(c.maxOutputTokens).toBe(1200);
    expect(c.thinkingConfig).toBeUndefined();
    const cut = (async () => ({ status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"say":"Half a sen' }] }, finishReason: 'MAX_TOKENS' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }) })) as unknown as typeof fetch;
    const r = await askCoach('gemini-3.8-flash', req, { ledger: ledger(), purpose: 't', fetchFn: cut });
    expect(r.error).toBe('reply is not JSON (cut off at the token limit)');
  });
});
