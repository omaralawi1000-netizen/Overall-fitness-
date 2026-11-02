/**
 * Shared word handling for the parser (English and Danish): folding æøå, number words, and the small text helpers the
 * set, food and workout readers share. Ported from old Aven's setCommand.ts, foodText.ts and workoutText.ts.
 */

/** Lower case, æ → ae, ø → o, å → a, accents out, anything but letters, digits, spaces, % and . becomes a space. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s%.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
/** Search-only folding: dictation often writes å as "aa" (koldskaal), so both sides collapse "aa" → "a". */
export const sfold = (s: string) => fold(s).replace(/aa/g, 'a');

const STOP = new Set(['the', 'a', 'an', 'some', 'of', 'af', 'en', 'et', 'med', 'with', 'my', 'min', 'mit']);
const stem = (t: string) => (t.length > 4 && t.endsWith('oes') ? t.slice(0, -2)
  : t.length > 4 && t.endsWith('ies') ? `${t.slice(0, -3)}y`
  : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
/** The words that carry meaning, folded and singular. */
export function tokens(s: string): string[] {
  return sfold(s).split(' ').filter((t) => t && !STOP.has(t)).map(stem);
}

/** Number words in both languages. "to", "en" and "et" are also ordinary words: readers use them only beside a unit. */
export const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  en: 1, et: 1, én: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10, elleve: 11, tolv: 12,
  tretten: 13, fjorten: 14, femten: 15, seksten: 16, sytten: 17, atten: 18, nitten: 19, tyve: 20, tredive: 30,
  fyrre: 40, halvtreds: 50, tres: 60, halvfjerds: 70, firs: 80, halvfems: 90, hundrede: 100,
};

// ── Spoken numbers that are more than one word ──────────────

type Tok = { k: 'u' | 't' | 'd' | 'h'; v: number };
const LOOSE = new Set(['en', 'et', 'én', 'to']); // ordinary words too: a number only where the caller says so
/** One number word, by size: u 1-9, t 10-19, d 20-90, h hundred. Digits and everything else are null. */
function tok(raw: string | undefined, loose: boolean): Tok | null {
  if (!raw) return null;
  const w = raw.toLowerCase().replace(/[.,!?]+$/, '');
  const v = NUMBER_WORDS[w];
  if (v === undefined || (!loose && LOOSE.has(w))) return null;
  return v === 100 ? { k: 'h', v } : v >= 20 ? { k: 'd', v } : v >= 10 ? { k: 't', v } : { k: 'u', v };
}
const DIGIT_WORDS: Record<string, string> = { zero: '0', nul: '0', ...Object.fromEntries(Object.entries(NUMBER_WORDS).filter(([, v]) => v >= 1 && v <= 9 && v !== undefined).map(([k, v]) => [k, String(v)])) };

/** One spoken number starting at `j`: its value and how many words it took. Null when no number word is there. */
function readNumber(words: string[], j: number, loose: boolean): { val: number; used: number; hundred: boolean } | null {
  let p = j, val = 0, hundred = false;
  if (/^(?:a|an)$/i.test(words[p] ?? '') && tok(words[p + 1], loose)?.k === 'h') p++; // "a hundred"
  // Danish "to og firs" (82): the "og" and the tens word make "to" a number even when the caller did not ask for loose ones
  if (tok(words[p], true)?.k === 'u' && /^og$/i.test(words[p + 1] ?? '') && tok(words[p + 2], true)?.k === 'd') {
    return { val: tok(words[p], true)!.v + tok(words[p + 2], true)!.v, used: p + 3 - j, hundred: false };
  }
  const t = tok(words[p], loose || tok(words[p + 1], true)?.k === 'h'), t2 = tok(words[p + 1], loose); // "to hundrede" is 200 even when "to" is usually a word
  if (!t) return null;
  const rest = (lz = false) => { // tens and ones after a hundred, or after nothing: "fifty", "twenty five", "fifteen", "five", Danish "fem og tyve"
    const L = loose || lz, r = tok(words[p], L);
    if (r?.k === 'u' && /^(?:halv|halvt|half)[.,!?]*$/i.test(words[p + 1] ?? '')) return; // "hundrede og en halv": the "en" belongs to the half
    if (r?.k === 'u' && /^og$/i.test(words[p + 1] ?? '') && tok(words[p + 2], L)?.k === 'd') { val += r.v + tok(words[p + 2], L)!.v; p += 3; }
    else if (r?.k === 'd') { val += r.v; p++; const u = tok(words[p], L); if (u?.k === 'u') { val += u.v; p++; } }
    else if (r && (r.k === 't' || r.k === 'u')) { val += r.v; p++; }
  };
  if (t.k === 'u' && t2?.k === 'h') { val = t.v * 100; p += 2; hundred = true; }
  else if (t.k === 'h') { val = 100; p++; hundred = true; }
  else if (t.k === 'u' && t2?.k === 'd') { // "two fifty" is 250, "one forty five" is 145
    val = t.v * 100 + t2.v; p += 2;
    const u = tok(words[p], loose); if (u?.k === 'u') { val += u.v; p++; }
  } else if (t.k === 'u' && /^og$/i.test(words[p + 1] ?? '') && tok(words[p + 2], loose)?.k === 'd') { // "to og firs" is 82
    val = t.v + tok(words[p + 2], loose)!.v; p += 3;
  } else rest();
  if (hundred) {
    const andWord = /^(?:and|og)$/i.test(words[p] ?? '');
    if (andWord) { const keep = p; p++; const before = val; rest(true); if (val === before) p = keep; } else rest();
  }
  return { val, used: p - j, hundred };
}

/**
 * "two hundred and fifty" → 250, "twenty five" → 25, "a hundred" → 100, "eighty two point five" → 82.5, the colloquial
 * "one forty" → 140, and Danish "to og firs" → 82. A single number word is left alone (the readers treat those
 * themselves: "One-arm Row" must keep its "one"); `loose` also counts to/en/et as numbers (food: "to hundrede gram").
 */
export function mergeNumberWords(input: string[], loose = false): string[] {
  // Danish dictation writes "femoghalvfjerds" as one word: split it into "fem og halvfjerds"
  const words = input.flatMap((x) => {
    const m = x.toLowerCase().match(/^(en|et|to|tre|fire|fem|seks|syv|otte|ni)og(tyve|tredive|fyrre|halvtreds|tres|halvfjerds|firs|halvfems)([.,!?]*)$/);
    return m ? [m[1], 'og', m[2] + m[3]] : [x];
  });
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const n = readNumber(words, i, loose);
    if (!n) { out.push(words[i]); continue; }
    let j = i + n.used, text = String(n.val), used = n.used;
    // a decimal point or comma, then digits: "eighty two point five", "82 komma 5"
    const sep = words[j]?.toLowerCase().replace(/[.,!?]+$/, '');
    if ((sep === 'point' || sep === 'komma' || sep === 'comma') && words[j + 1]) {
      const d = words[j + 1].toLowerCase().replace(/[.,!?]+$/, '');
      const digit = /^\d+$/.test(d) ? d : DIGIT_WORDS[d];
      if (digit) { text += `.${digit}`; j += 2; used += 2; }
    }
    // "eighty and a half", "tres og en halv"
    const half = words.slice(j, j + 3).map((x) => x.toLowerCase().replace(/[.,!?]+$/, '')).join(' ');
    if (!text.includes('.') && /^(?:and a half|og en halv|og et halvt)$/.test(half)) { text = String(Number(text) + 0.5); j += 3; used += 3; }
    if (used < 2 && !n.hundred) { out.push(words[i]); continue; } // a single number word stays as it was said
    out.push(text + (words[j - 1].match(/[.,!?]+$/)?.[0] ?? ''));
    i = j - 1;
  }
  return out;
}

/** "82 komma 5", "82 point 5" with digits already: one decimal number. */
export function mergeDecimals(text: string): string {
  text = text.replace(/\b(\d+(?:\.\d+)?)\s+(?:and a half|og en halv|og et halvt)\b/gi, (_, a: string) => String(Number(a) + 0.5)); // "82 and a half"
  return text.replace(/\b(\d+)\s+(?:point|komma|comma)\s+(\d+|zero|nul|one|two|three|four|five|six|seven|eight|nine|tre|fire|fem|seks|syv|otte|ni)\b/gi, (_, a: string, b: string) => `${a}.${/^\d+$/.test(b) ? b : DIGIT_WORDS[b.toLowerCase()]}`);
}
