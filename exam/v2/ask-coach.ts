/**
 * Send one Coach request to any exam model (Gemini or Claude) through the spend-guarded `call`, and read the reply.
 * The same request goes to every setup (Flash, Sonnet, the mix, the Opus opponent), so differences are the model's.
 */
import { readReply, type CoachRequest, type ModelReply } from '../../src/coach/coach';
import { call, CallError, type CallOpts, type GeminiBody } from '../providers';

/** Gemini's schema dialect: upper-case types (the same schema reaches Claude through `toJsonSchema`, which lowers them) */
function geminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(geminiSchema);
  if (!s || typeof s !== 'object') return s;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' ? String(v).toUpperCase() : k === 'description' ? v : geminiSchema(v)]));
}

/**
 * Gemini counts its thinking inside maxOutputTokens, so a bare 1,200 can be spent on thinking and cut the JSON short
 * (the 3 Nov run: Flash's "reply is not JSON" on most cases). Gemini gets a fixed thinking budget on top of the answer's
 * own room; Claude's thinking room is added by `toClaude`.
 */
export const GEMINI_THINKING = 4096;
export function toBody(req: CoachRequest, maxOut = 1200, model = 'gemini'): GeminiBody {
  const gemini = !model.startsWith('claude-');
  return {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      responseMimeType: 'application/json', responseSchema: geminiSchema(req.schema),
      maxOutputTokens: gemini ? maxOut + GEMINI_THINKING : maxOut,
      ...(gemini ? { thinkingConfig: { thinkingBudget: GEMINI_THINKING } } : {}),
    },
  };
}

export interface Asked {
  model: string; reply?: ModelReply; dropped: string[]; error?: string; usd: number; ms: number;
  /** the call itself failed (network, refused, cap): no answer from the model, so the run is not saved as finished */
  callFailed?: boolean;
}

/** busy or dropped: worth asking again after a pause (a 4xx other than 429 never is) */
const busy = (e: CallError) => e.status === -1 || e.status === 429 || e.status === 503 || e.status === 529 || e.status === 500;
export const RETRY_WAITS_MS = [5_000, 15_000, 40_000, 90_000];

export async function askCoach(model: string, req: CoachRequest, o: CallOpts & { wait?: (ms: number) => Promise<void> }): Promise<Asked> {
  const t0 = performance.now();
  const wait = o.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  try {
    let r;
    // a failed attempt may still be billed: its ledger charge counts in the turn's cost too (Codex, PR #81)
    const spentBefore = o.ledger.spent;
    for (let n = 0; ; n++) {
      try { r = await call(model, toBody(req, 1200, model), o); break; } catch (e) {
        if (!(e instanceof CallError) || !busy(e) || n >= RETRY_WAITS_MS.length) { if (e instanceof CallError) (e as CallError & { usd?: number }).usd = o.ledger.spent - spentBefore; throw e; }
        await wait(RETRY_WAITS_MS[n]);
      }
    }
    const usd = Math.max(r.usd, o.ledger.spent - spentBefore);
    const ms = Math.round(performance.now() - t0);
    // a candidate blocked for safety has no content: that is an answer that failed, not a crash (Codex, PR #81)
    const text = r.candidates[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
    let raw: unknown;
    const cut = (r.candidates[0] as { finishReason?: string } | undefined)?.finishReason === 'MAX_TOKENS';
    try { raw = JSON.parse(text); } catch { return { model, dropped: [], error: cut ? 'reply is not JSON (cut off at the token limit)' : 'reply is not JSON', usd, ms }; }
    const read = readReply(raw);
    return 'error' in read ? { model, dropped: [], error: read.error, usd, ms } : { model, reply: read.reply, dropped: read.dropped, usd, ms };
  } catch (e) {
    // status 0 is a finished answer that failed (Claude cut off at max_tokens, a refusal): scored like a cut-off Gemini
    // reply, never thrown away as a call that did not happen (Codex, PR #81)
    if (e instanceof CallError) return { model, dropped: [], error: `${e.status}: ${e.message}`, usd: (e as CallError & { usd?: number }).usd ?? 0, ms: Math.round(performance.now() - t0), ...(e.status === 0 ? {} : { callFailed: true }) };
    throw e;
  }
}
