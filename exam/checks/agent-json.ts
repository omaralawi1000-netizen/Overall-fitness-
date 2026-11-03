/**
 * Reading the Coach's answer object ({lookups?, reply, actions}) from a model's text, for the Coach exam.
 *
 * Gemini is forced to bare JSON by responseMimeType. Claude has no such switch for old Aven's schema (too big for its
 * strict mode), so in plain-JSON mode it sometimes answers in prose, or wraps or breaks the object. The first paid run
 * (3 Nov 2026) lost 35 of Sonnet's 104 answers that way, though their words read as real Coach replies. The exam grades
 * the coaching, so such an answer is kept: but it is marked, every mark is counted in the report as a format failure
 * (the app itself would have shown an error), and anything that cannot be read honestly stays an error.
 *
 * Pure, no imports: tested in this repo (tests/exam/agent-json.test.ts).
 */

/** How the answer was read: a clean object needs no mark. */
export type AgentFormat = 'json' | 'extracted' | 'partial' | 'prose';

/** Every balanced {...} in the text, in order, skipping braces inside JSON strings. */
function objects(t: string): string[] {
  const out: string[] = [];
  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
    let depth = 0, inStr = false;
    for (let j = i; j < t.length; j++) {
      const c = t[j];
      if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { out.push(t.slice(i, j + 1)); break; }
    }
  }
  return out;
}

/** The "reply" string of a broken or cut-off object, decoded up to where it ends (or the text ends). */
function replyOf(t: string): string {
  const m = /"reply"\s*:\s*"/.exec(t);
  if (!m) return '';
  let out = '';
  for (let i = m.index + m[0].length; i < t.length; i++) {
    const c = t[i];
    if (c === '"') break;
    if (c !== '\\') { out += c; continue; }
    const nx = t[++i];
    if (nx === undefined) break;
    if (nx === 'u') { const hex = t.slice(i + 1, i + 5); if (!/^[0-9a-fA-F]{4}$/.test(hex)) break; out += String.fromCharCode(parseInt(hex, 16)); i += 4; continue; }
    out += ({ n: '\n', t: '\t', r: '', b: '', f: '' } as Record<string, string>)[nx] ?? nx;
  }
  return out.trim();
}

/** a final answer, or a look-up request the harness runs before the answer (the app's lookup loop) */
const isAnswer = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && ('reply' in v || 'actions' in v || 'lookups' in v);

/**
 * The answer object and how it was read. Throws when nothing honest can be read: a broken object with no reply, or
 * prose that holds a brace (it may be a broken object, not words).
 */
export function readAgent(text: string): { value: Record<string, unknown>; format: AgentFormat } {
  // (only bare JSON is clean: the app parses the text as it comes, so even a ```json fence would have been an error there)
  const t = text.trim();
  try { const v = JSON.parse(t); if (isAnswer(v)) return { value: v, format: 'json' }; } catch { /* read it below */ }
  // 1. a whole object somewhere in the text (a fence or a sentence around it, or a second object after it)
  for (const o of objects(t)) {
    try { const v = JSON.parse(o); if (isAnswer(v)) return { value: v, format: 'extracted' }; } catch { /* the next one */ }
  }
  // 2. a broken or cut-off object: its reply words only, and no actions (a half-read action is never guessed)
  const reply = replyOf(t);
  if (reply) return { value: { reply, actions: [] }, format: 'partial' };
  // 3. plain words with no object at all: they are the reply
  if (t && !/[{}]/.test(t)) return { value: { reply: t, actions: [] }, format: 'prose' };
  throw new Error(`invalid JSON: ${t.slice(0, 200)}`);
}
