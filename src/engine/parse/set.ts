/**
 * Hands-free sets: what was said, read without any AI (instant, free, private). Only set-shaped phrases count — "8 at 80",
 * "80 for 8", "8", "same again", "done", "skip", "+15 seconds", and the Danish ones ("8 på 80", "samme igen", "spring
 * over") — and anything else is ignored rather than guessed at: talking to someone else must never log a set.
 *
 * Ported from old Aven's setCommand.ts with three changes (docs/engine/SPEC.md, contradiction 3, and the "refuse to
 * guess" rule):
 *  - a "no" inside a phrase is a self-correction ("80… no, 60" is 60); only a phrase that is just "undo" or "fortryd"
 *    undoes, and a bare "no" asks what was meant;
 *  - a correction the parser can't place with certainty ("8 at 80, no 85": reps or kilos?) asks instead of choosing;
 *  - pounds are understood ("180 lb for 5" is kept as 81.65 kg, with what was said beside it).
 */
import { NUMBER_WORDS } from './words';
import { displayToKg } from '../units';

export type SetCommand =
  | { kind: 'set'; kg?: number; reps?: number; entered?: { value: number; unit: 'lb' } }
  | { kind: 'same' }
  | { kind: 'done' }
  | { kind: 'skip' }
  | { kind: 'rest'; sec: number }
  | { kind: 'undo' }
  /** not sure what was meant: ask, offering the readings (never log a guess) */
  | { kind: 'ask'; why: 'bareNo' | 'correction' | 'which'; options?: SetCommand[] };

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const KG = String.raw`(kg|kilo|kilos|kilogram|kilograms|kilo's|lbs?|pounds?)`;
const REPS = String.raw`(?:reps?|repetitions?|times|gange|gentagelser|rep)`;

/** "62 and a half" / "62 og en halv" → "62.5"; number words → digits; filler and punctuation out. */
function normal(text: string): string {
  let s = ` ${text.toLowerCase()} `
    .replace(/[!?;:"“”]/g, ' ')
    .replace(/\.(?!\d)/g, ' ') // a full stop ends the sentence (a decimal point is followed by a digit)
    .replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/[a-zæøåé]+/g, (w) => (NUMBER_WORDS[w] !== undefined && w !== 'to' && w !== 'en' && w !== 'et' ? String(NUMBER_WORDS[w]) : w));
  s = s.replace(/\b([2-9]0) ([1-9])\b/g, (_, a, b) => String(Number(a) + Number(b))); // "eighty two" → 82
  s = s.replace(/(\d+)\s+(?:and a half|og en halv|komma fem)\b/g, '$1.5');
  // "to" / "en" are also ordinary words: a digit only beside a set word ("to gange", "en rep")
  s = s.replace(/\b(to|en|et)\s+(gange|gentagelser|rep|reps)\b/g, (_, w, r) => `${NUMBER_WORDS[w]} ${r}`);
  s = s.replace(/\b(?:uh+|um+|øh+|okay|ok|so|then|that was|that's|det var|så|well|right|yeah|ja|just|lige)\b/g, ' ');
  return s.replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
}
const n = (x: string) => Number(x.replace(',', '.'));
const weight = (v: string, unit?: string): { kg: number; entered?: { value: number; unit: 'lb' } } =>
  unit && /^(lb|pound)/.test(unit) ? { kg: Math.round(displayToKg(n(v), 'lb') * 100) / 100, entered: { value: n(v), unit: 'lb' } } : { kg: n(v) };

/** One set-shaped phrase, with no correction in it. Null when it isn't one. */
export function readSet(text: string): SetCommand | null {
  const s = normal(text);
  if (!s || s.split(' ').length > 9) return null; // a sentence, not a set
  if (/^(?:undo|undo (?:that|it|the last(?: one)?)|fortryd|fortryd (?:det|den)|annuller)$/.test(s)) return { kind: 'undo' };
  if (/^(?:same(?: again| as before| as last)?|again|det samme|samme(?: igen| som før)?|igen)$/.test(s)) return { kind: 'same' };
  if (/^(?:done|finished|got it|set done|færdig|klar|done with (?:the|that) set)$/.test(s)) return { kind: 'done' };
  if (/^(?:skip(?: (?:it|this|this set|the set))?|spring over|spring den over|drop (?:it|this set))$/.test(s)) return { kind: 'skip' };
  let m = s.match(new RegExp(`^(?:add |plus |\\+ ?)?${NUM} ?(?:s|sec|secs|seconds|sekunder)(?: (?:more|extra|mere|ekstra|rest|pause))?$`));
  if (m) return { kind: 'rest', sec: Math.round(n(m[1])) };
  m = s.match(new RegExp(`^(?:add |plus |\\+ ?)?(?:a|1|one|et) ?(?:minute|minut)(?: (?:more|extra|mere|ekstra))?$`));
  if (m) return { kind: 'rest', sec: 60 };
  // "8 x 80" / "80 x 8": a multiplication sign does not say which number is the weight, only a unit does
  m = s.match(new RegExp(`^${NUM} ?${KG}? (?:x|×) ${NUM} ?${KG}?$`));
  if (m) {
    const [, a, ua, b, ub] = m;
    if (ua && ub) return null; // two units: not a set
    if (ua) return Number.isInteger(n(b)) ? { kind: 'set', ...weight(a, ua), reps: n(b) } : null;
    if (ub) return Number.isInteger(n(a)) ? { kind: 'set', reps: n(a), ...weight(b, ub) } : null;
    const asWeightFirst = Number.isInteger(n(b)) ? ({ kind: 'set', ...weight(a), reps: n(b) } as const) : null;
    const asRepsFirst = Number.isInteger(n(a)) ? ({ kind: 'set', reps: n(a), ...weight(b) } as const) : null;
    const options = [asWeightFirst, asRepsFirst].filter((x): x is NonNullable<typeof x> => !!x);
    return options.length ? { kind: 'ask', why: 'which', options } : null;
  }
  // reps at/for weight
  m = s.match(new RegExp(`^${NUM} ?${REPS}? (?:at|@|with|på|med) ${NUM} ?${KG}?$`));
  if (m && Number.isInteger(n(m[1]))) return { kind: 'set', reps: n(m[1]), ...weight(m[2], m[3]) };
  // weight for reps
  m = s.match(new RegExp(`^${NUM} ?${KG}? (?:for|times|til|i) ${NUM} ?${REPS}?$`));
  if (m && Number.isInteger(n(m[3]))) return { kind: 'set', ...weight(m[1], m[2]), reps: n(m[3]) };
  // "80 kg 8 reps" / "8 reps 80 kg"
  m = s.match(new RegExp(`^${NUM} ?${KG} ${NUM} ?${REPS}$`));
  if (m && Number.isInteger(n(m[3]))) return { kind: 'set', ...weight(m[1], m[2]), reps: n(m[3]) };
  m = s.match(new RegExp(`^${NUM} ?${REPS} ${NUM} ?${KG}$`));
  if (m && Number.isInteger(n(m[1]))) return { kind: 'set', reps: n(m[1]), ...weight(m[2], m[3]) };
  // one number: reps ("8", "8 reps"), or a weight when a unit says so ("82.5 kilos")
  m = s.match(new RegExp(`^${NUM} ?${KG}$`));
  if (m) return { kind: 'set', ...weight(m[1], m[2]) };
  m = s.match(new RegExp(`^${NUM}(?: ?${REPS})?$`));
  if (m && Number.isInteger(n(m[1]))) return { kind: 'set', reps: n(m[1]) };
  return null;
}

// "no" inside a phrase takes back what came before it
const CORRECTION = /(?:^|[\s,.…–-]+)(?:no i mean|nej jeg mener|i mean|make that|jeg mener|actually|sorry|nope|nej|no)(?=[\s,.…–!?-]|$)[\s,.…–!?-]*/gi;

export function parseSetCommand(text: string): SetCommand | null {
  const marks = [...text.matchAll(CORRECTION)];
  if (!marks.length) return readSet(text);
  const last = marks[marks.length - 1];
  const before = text.slice(0, last.index).trim();
  const after = text.slice(last.index! + last[0].length).trim();
  if (!before && !after) return { kind: 'ask', why: 'bareNo' }; // "no" alone: undo it, or no to what?
  const a = readSet(after), b = before ? parseSetCommand(before) : null; // an earlier "no" has already been settled
  if (!a && !b) return null; // "no problem", "no thanks": talk, not a set
  // nothing to take back, or what came before is not a set-shaped phrase: never log, ask
  if (!before || !after || !b || !a) return { kind: 'ask', why: 'correction', ...(a ? { options: [a] } : {}) };
  if (a.kind === 'undo') return { kind: 'ask', why: 'correction' }; // only a whole "undo" undoes, never one inside a correction
  if (a.kind !== 'set') return a; // "8 at 80, no, skip" is skip
  if (b.kind !== 'set') return { kind: 'ask', why: 'correction', options: [a] };
  // both are sets: the new part replaces what it names, and keeps the rest
  const bothFields = a.kg !== undefined && a.reps !== undefined;
  if (bothFields) return a;
  // a bare number (no unit, no "reps") is only safe to place when the old part had just reps
  if (a.reps !== undefined && a.kg === undefined) {
    const named = /\b(?:reps?|repetitions?|gange|gentagelser|times)\b/i.test(after);
    if (named || b.kg === undefined) return { kind: 'set', ...(b.kg !== undefined ? { kg: b.kg, ...(b.entered ? { entered: b.entered } : {}) } : {}), reps: a.reps };
    // "8 at 80, no 85": reps or kilos? ask, never choose
    return { kind: 'ask', why: 'which', options: [{ kind: 'set', kg: a.reps, ...(b.reps !== undefined ? { reps: b.reps } : {}) }, { kind: 'set', ...(b.kg !== undefined ? { kg: b.kg } : {}), reps: a.reps }] };
  }
  // the new part names a weight (a unit was said): it replaces the weight and keeps the reps
  return { kind: 'set', kg: a.kg, ...(a.entered ? { entered: a.entered } : {}), ...(b.reps !== undefined ? { reps: b.reps } : {}) };
}

/**
 * Is this set believable? A weight more than 25 % off the plan (or last time), or more than 30 reps, is asked about on
 * screen instead of logged ("18 or 80?" — speech often drops or adds a digit). Returns the choices to offer, or null.
 */
export function guardSet(cmd: { kg?: number; reps?: number }, planned: { kg?: number; reps?: number }): { kg?: number[]; reps?: number[] } | null {
  const out: { kg?: number[]; reps?: number[] } = {};
  if (cmd.kg !== undefined && planned.kg) {
    const off = Math.abs(cmd.kg - planned.kg) / planned.kg;
    if (off > 0.25) {
      // the likely slip: a digit dropped or added (18 ↔ 80, 8 ↔ 80, 800 ↔ 80), else the plan
      const near = [cmd.kg * 10, cmd.kg / 10, planned.kg].find((x) => Math.abs(x - planned.kg!) / planned.kg! <= 0.25) ?? planned.kg;
      out.kg = [cmd.kg, Math.round(near * 4) / 4];
    }
  }
  if (cmd.reps !== undefined && (cmd.reps > 30 || cmd.reps < 1)) out.reps = [cmd.reps, planned.reps ?? Math.min(30, Math.round(cmd.reps / 10))];
  return out.kg || out.reps ? out : null;
}

/**
 * A number speech got wrong, fixed instead of asked about ("if it mishears 18 and knows I always lift 80, it just logs
 * 80"). Only the slips speech really makes count — a digit dropped or added (8 ↔ 80, 800 ↔ 80) and teen ↔ ty (18 ↔ 80,
 * 14 ↔ 40) — and only when the fixed number lands within 10 % of what was planned or done last time. Anything else is
 * logged as said (a real deload is not "corrected"). Returns what to log and what was heard, when it changed.
 */
export function fixMisheard(said: { kg?: number; reps?: number }, usual: { kg?: number; reps?: number }): { kg?: number; reps?: number; heard?: { kg?: number; reps?: number } } {
  const out: { kg?: number; reps?: number; heard?: { kg?: number; reps?: number } } = { kg: said.kg, reps: said.reps };
  const slips = (x: number) => {
    const c = [x * 10, x / 10];
    if (Number.isInteger(x) && x >= 13 && x <= 19) c.push((x - 10) * 10); // eighteen → eighty
    if (Number.isInteger(x) && x >= 30 && x <= 90 && x % 10 === 0) c.push(x / 10 + 10); // eighty → eighteen
    return c;
  };
  if (said.kg !== undefined && usual.kg) {
    const off = Math.abs(said.kg - usual.kg) / usual.kg;
    const fix = off > 0.25 ? slips(said.kg).find((x) => Math.abs(x - usual.kg!) / usual.kg! <= 0.1) : undefined;
    if (fix !== undefined) { out.kg = Math.round(fix * 4) / 4; out.heard = { ...out.heard, kg: said.kg }; }
  }
  if (said.reps !== undefined && said.reps > 30) {
    const fix = slips(said.reps).find((x) => Number.isInteger(x) && x >= 1 && x <= 30 && (!usual.reps || Math.abs(x - usual.reps) <= Math.max(3, usual.reps * 0.5)));
    if (fix !== undefined) { out.reps = fix; out.heard = { ...out.heard, reps: said.reps }; }
  }
  return out;
}
