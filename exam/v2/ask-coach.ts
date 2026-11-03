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

export function toBody(req: CoachRequest, maxOut = 1200): GeminiBody {
  return {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema(req.schema), maxOutputTokens: maxOut },
  };
}

export interface Asked { model: string; reply?: ModelReply; dropped: string[]; error?: string; usd: number; ms: number }

export async function askCoach(model: string, req: CoachRequest, o: CallOpts): Promise<Asked> {
  const t0 = performance.now();
  try {
    const r = await call(model, toBody(req), o);
    const ms = Math.round(performance.now() - t0);
    const text = r.candidates[0]?.content.parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { return { model, dropped: [], error: 'reply is not JSON', usd: r.usd, ms }; }
    const read = readReply(raw);
    return 'error' in read ? { model, dropped: [], error: read.error, usd: r.usd, ms } : { model, reply: read.reply, dropped: read.dropped, usd: r.usd, ms };
  } catch (e) {
    if (e instanceof CallError) return { model, dropped: [], error: `${e.status}: ${e.message}`, usd: 0, ms: Math.round(performance.now() - t0) };
    throw e;
  }
}
