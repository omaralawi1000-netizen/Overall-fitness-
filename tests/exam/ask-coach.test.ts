import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coachRequest } from '../../src/coach/coach';
import { buildFacts } from '../../src/coach/facts';
import { askCoach, toBody } from '../../exam/v2/ask-coach';
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
});
