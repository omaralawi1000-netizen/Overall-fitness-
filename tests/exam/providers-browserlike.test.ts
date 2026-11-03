// Old Aven's exam runs under jsdom, which looks like a browser to the Anthropic SDK (found on the first paid run, 3 Nov).
import { it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call, CallError, Ledger, type GeminiBody } from '../../exam/providers';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('the Claude client starts in a browser-like test environment (jsdom)', async () => {
  vi.stubGlobal('window', { document: {} });
  vi.stubGlobal('document', {});
  vi.stubEnv('AVEN_ANTHROPIC_KEY', 'test-not-a-key');
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'stub' } }), { status: 400, headers: { 'content-type': 'application/json' } }));
  const body: GeminiBody = { contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 100 } };
  const ledger = new Ledger(join(mkdtempSync(join(tmpdir(), 'led-')), 'l.jsonl'), 5);
  // (it reaches the (stubbed) API and gets its 400, instead of the SDK refusing to start in a "browser")
  await expect(call('claude-sonnet-5-5', body, { ledger, purpose: 'jsdom' })).rejects.toSatisfy((e: unknown) => e instanceof CallError && e.status === 400);
});
