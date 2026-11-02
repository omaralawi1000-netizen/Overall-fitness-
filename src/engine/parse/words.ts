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
