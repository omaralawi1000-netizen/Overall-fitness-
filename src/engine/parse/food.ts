/**
 * Food words: "200 grams of skyr, one banana and 60 grams of oats" → rows of amount + unit + what. No food database
 * here (that is a later phase): the parser only reads what was said, and a row it cannot place is handed back unread
 * instead of guessed. Ported from old Aven's foodText.ts (parseFoodText, rowQuantity, density table), with:
 *  - a row needs an amount said out loud ("a banana" counts, a bare "banana" does not: that could be anything);
 *  - the unit table also understands Danish spellings after æøå folding ("dåse", "håndfuld").
 */
import { fold } from './words';

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, en: 1, et: 1, two: 2, to: 2, three: 3, tre: 3, four: 4, fire: 4, five: 5, fem: 5,
  six: 6, seks: 6, seven: 7, syv: 7, eight: 8, otte: 8, nine: 9, ni: 9, ten: 10, ti: 10, eleven: 11, twelve: 12,
  half: 0.5, halv: 0.5, halvt: 0.5, halve: 0.5, quarter: 0.25,
};

type Dim = { kind: 'g'; f: number } | { kind: 'ml'; f: number } | { kind: 'count'; word?: string };
const UNITS: Record<string, Dim> = {
  g: { kind: 'g', f: 1 }, gram: { kind: 'g', f: 1 }, grams: { kind: 'g', f: 1 }, gr: { kind: 'g', f: 1 },
  kg: { kind: 'g', f: 1000 }, kilo: { kind: 'g', f: 1000 }, kilos: { kind: 'g', f: 1000 }, kilogram: { kind: 'g', f: 1000 },
  ml: { kind: 'ml', f: 1 }, milliliter: { kind: 'ml', f: 1 }, millilitre: { kind: 'ml', f: 1 }, milliliters: { kind: 'ml', f: 1 },
  cl: { kind: 'ml', f: 10 }, dl: { kind: 'ml', f: 100 }, deciliter: { kind: 'ml', f: 100 }, l: { kind: 'ml', f: 1000 },
  liter: { kind: 'ml', f: 1000 }, litre: { kind: 'ml', f: 1000 }, liters: { kind: 'ml', f: 1000 }, litres: { kind: 'ml', f: 1000 },
  tsp: { kind: 'ml', f: 5 }, teaspoon: { kind: 'ml', f: 5 }, tsk: { kind: 'ml', f: 5 }, teske: { kind: 'ml', f: 5 },
  tbsp: { kind: 'ml', f: 15 }, tablespoon: { kind: 'ml', f: 15 }, spsk: { kind: 'ml', f: 15 }, spiseske: { kind: 'ml', f: 15 },
  slice: { kind: 'count', word: 'slice' }, slices: { kind: 'count', word: 'slice' }, skive: { kind: 'count', word: 'slice' }, skiver: { kind: 'count', word: 'slice' },
  piece: { kind: 'count' }, pieces: { kind: 'count' }, stk: { kind: 'count' }, stykke: { kind: 'count' }, stykker: { kind: 'count' },
  handful: { kind: 'count', word: 'handful' }, handfuls: { kind: 'count', word: 'handful' }, handfulde: { kind: 'count', word: 'handful' },
  handfuld: { kind: 'count', word: 'handful' }, haandfuld: { kind: 'count', word: 'handful' },
  glass: { kind: 'count', word: 'glass' }, glasses: { kind: 'count', word: 'glass' }, glas: { kind: 'count', word: 'glass' },
  can: { kind: 'count', word: 'can' }, cans: { kind: 'count', word: 'can' }, dase: { kind: 'count', word: 'can' }, daase: { kind: 'count', word: 'can' },
  cup: { kind: 'count', word: 'cup' }, cups: { kind: 'count', word: 'cup' }, kop: { kind: 'count', word: 'cup' },
  scoop: { kind: 'count', word: 'scoop' }, scoops: { kind: 'count', word: 'scoop' },
  bowl: { kind: 'count', word: 'bowl' }, bowls: { kind: 'count', word: 'bowl' }, skal: { kind: 'count', word: 'bowl' },
  serving: { kind: 'count' }, servings: { kind: 'count' }, portion: { kind: 'count' }, portioner: { kind: 'count' },
};

/** A unit word, also in the plural ("teaspoons", "tablespoons", "deciliters"). */
const unitOf = (w: string): Dim | undefined => UNITS[w] ?? (w.length > 2 && w.endsWith('s') ? UNITS[w.slice(0, -1)] : undefined);

export interface FoodRow {
  /** the words this row was read from */
  raw: string;
  /** grams, millilitres, or a count, depending on `dim` */
  amount: number;
  dim: 'g' | 'ml' | 'count';
  /** "slice", "glass"… when a counted unit was said */
  countWord?: string;
  /** what was eaten, as said (looked up later) */
  query: string;
  /** only "a"/"an" stood for the amount ("a dog"): too thin to log without an "I ate" or a meal word to go with it */
  weak?: true;
}

export function splitSegments(text: string): string[] {
  const t = text.replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ').trim();
  return t
    .split(/\s*(?:[,;]|\.\s+|\.$|\band\b|\bog\b|\bplus\b|\bthen\b|\bsamt\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One spoken segment as a row, or null when no amount was said or no food was named. */
function readRow(seg: string): FoodRow | null {
  const words = seg.toLowerCase().replace(/[.]$/, '').split(/\s+/);
  let i = 0;
  let amount: number | undefined;
  const numTok = words[i];
  const frac = numTok.match(/^(\d+)\/(\d+)$/);
  const glued = numTok.match(/^(\d+(?:\.\d+)?)([a-zæøå]+)$/); // "200g"
  if (frac && Number(frac[2]) > 0) { amount = Number(frac[1]) / Number(frac[2]); i++; }
  else if (/^\d+(\.\d+)?$/.test(numTok)) { amount = Number(numTok); i++; }
  else if (glued && UNITS[fold(glued[2])]) { amount = Number(glued[1]); words.splice(i, 1, glued[1], glued[2]); i++; }
  else if (WORD_NUM[numTok] !== undefined && words.length > 1) { amount = WORD_NUM[numTok]; i++; }
  // "1 1/2 cups": a whole number and a fraction are one quantity
  const mixed = amount !== undefined && Number.isInteger(amount) && words[i]?.match(/^(\d+)\/(\d+)$/);
  if (mixed && Number(mixed[2]) > 0) { amount! += Number(mixed[1]) / Number(mixed[2]); i++; }
  if (amount === undefined) return null; // no amount said: could be anything, so not a food row
  // "half a banana"
  if (amount === 0.5 && (words[i] === 'a' || words[i] === 'en' || words[i] === 'et')) i++;
  let dim: FoodRow['dim'] = 'count';
  let factor = 1;
  let countWord: string | undefined;
  const u = unitOf(words[i] ? fold(words[i]) : '');
  const weak = !u && /^(a|an|en|et)$/.test(numTok);
  if (u) {
    i++;
    if (u.kind === 'count') countWord = u.word; else { dim = u.kind; factor = u.f; }
  }
  if (words[i] === 'of' || words[i] === 'af') i++;
  const query = words.slice(i).join(' ').trim();
  if (!query || !(amount > 0)) return null;
  if (/^\d+(?:[./]\d+)?(?:\s|$)/.test(query)) return null; // a second quantity left in the name was not understood
  return { raw: seg, amount: Math.round(amount * factor * 1000) / 1000, dim, ...(countWord ? { countWord } : {}), query, ...(weak ? { weak: true as const } : {}) };
}

/** What was read, and the pieces that could not be (shown to the person, never dropped silently). */
export function parseFood(text: string): { rows: FoodRow[]; unread: string[] } {
  const rows: FoodRow[] = [];
  const unread: string[] = [];
  for (const seg of splitSegments(text)) {
    const r = readRow(seg);
    if (r) rows.push(r); else unread.push(seg);
  }
  return { rows, unread };
}

// ── Turning a row into a real quantity of a known food ──────

/** Just what the conversion needs of a food (the full food list comes in a later phase). */
export interface FoodShape {
  name: string;
  /** what the nutrients are per 100 of */
  basis: 'g' | 'ml';
  portions: { id: string; label: string; amount: number; verified?: boolean }[];
  /** g per ml, when known */
  density?: number;
}
export type Quantity = { amount: number; unit: 'g' | 'ml' } | { amount: number; unit: 'portion'; portionId: string };
export interface RowQuantity { qty: Quantity | null; estimated: boolean; problem?: 'needsGrams' | 'noAmount' }

/** ml in a portion's label ("1 dl (40 g)", "1 spsk", "1 cup"), when it names a volume. */
const VOL_WORD: [RegExp, number][] = [
  [/(\d+(?:[.,]\d+)?)?\s*dl\b/, 100], [/(\d+(?:[.,]\d+)?)?\s*ml\b/, 1],
  [/(\d+(?:[.,]\d+)?)?\s*(?:tbsp|spsk|tablespoons?|spiseske)/, 15], [/(\d+(?:[.,]\d+)?)?\s*(?:tsp|tsk|teaspoons?|teske)/, 5],
  [/(\d+(?:[.,]\d+)?)?\s*(?:cups?|kop)\b/, 240],
];
/** A label with fractions and decimal commas made plain, then folded: "1/2 cup" → "0.5 cup", "1,5 dl" → "1.5 dl". */
const plainLabel = (label: string) => fold(label.toLowerCase().replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => String(Number(a) / Number(b))).replace(/(\d),(\d)/g, '$1.$2'));
/** How many of the counted thing a portion stands for: "2 slices (50 g)" is 2, "1 slice" is 1, "1/2 pizza" is 0.5. */
function portionCount(label: string): number {
  const m = plainLabel(label).match(/^(\d+(?:\.\d+)?)(?![\d.]*\s*-)\s+[a-z]/);
  return m && Number(m[1]) > 0 ? Number(m[1]) : 1;
}
function portionMl(label: string): number | undefined {
  const l = plainLabel(label);
  for (const [re, ml] of VOL_WORD) { const m = l.match(re); if (m) return (m[1] ? Number(m[1].replace(',', '.')) : 1) * ml; }
  return undefined;
}
/** g per ml of common foods measured by volume (oats by the dl weigh far less than water). */
const DENSITY: [RegExp, number][] = [
  [/\b(oats?|havregryn|oatmeal|muesli|mysli|granola)\b/, 0.4], [/\b(cornflakes|flakes)\b/, 0.13], [/\b(flour|mel|hvedemel)\b/, 0.55],
  [/\b(protein ?powder|proteinpulver|whey)\b/, 0.45], [/\b(sugar|sukker)\b/, 0.85], [/\b(rice|ris)\b/, 0.85],
  [/\b(honey|honning|syrup|sirup)\b/, 1.4], [/\b(oil|olie)\b/, 0.92], [/\b(peanut ?butter|peanutbutter|jordnoddesmor)\b/, 1.05], [/\b(butter|smor)\b/, 0.95],
  [/\b(milk|maelk|maelken|yogurt|yoghurt|skyr|kefir|ymer|cream|flode|juice|water|vand)\b/, 1.03], [/\b(cottage|hytteost|quark|kvark)\b/, 1.0],
];
/** A food measured in ml is a liquid: oil and syrup are told apart, everything else is about as heavy as water (never a dry ingredient's bulk density: oat milk is not oats). */
const LIQUID: [RegExp, number][] = [[/\b(honey|honning|syrup|sirup)\b/, 1.4], [/\b(oil|olie)\b/, 0.92]];
const densityOf = (food: FoodShape) => {
  if (food.density && food.density > 0) return food.density;
  const n = fold(food.name);
  if (food.basis === 'ml') return LIQUID.find(([re]) => re.test(n))?.[1] ?? 1.03;
  return DENSITY.find(([re]) => re.test(n))?.[1];
};

/** A portion that only stands for "100 g of it" (a database's default serving), not a piece someone would count. */
export function placeholderPortion(p: { label: string; amount: number }, basis: string): boolean {
  const l = fold(p.label);
  return p.amount === 100 && (/^(1\s*)?(serving|portion|servering|serv\.?)\b/.test(l) || l.replace(/\s+/g, '') === `100${basis}`);
}

/** A parsed row against a chosen food: a real quantity, flagged when it is an estimate, or why it cannot be worked out. */
export function rowQuantity(row: FoodRow, food: FoodShape): RowQuantity {
  if (!(row.amount > 0)) return { qty: null, estimated: false, problem: 'noAmount' };
  if (row.dim === 'g' || row.dim === 'ml') {
    if (food.basis === row.dim) return { qty: { amount: row.amount, unit: row.dim }, estimated: false };
    // a volume on a food weighed in grams (or the other way): its own dl/tbsp/cup portion first, then how heavy it is per ml
    if (row.dim === 'ml') {
      const p = food.portions.map((x) => ({ x, ml: portionMl(x.label) })).find((c) => c.ml);
      if (p?.ml) return { qty: { amount: Math.round((row.amount / p.ml) * 100) / 100, unit: 'portion', portionId: p.x.id }, estimated: !p.x.verified };
    }
    const d = densityOf(food);
    if (d) return { qty: { amount: Math.round(row.dim === 'ml' ? row.amount * d : row.amount / d), unit: food.basis }, estimated: true };
    return { qty: null, estimated: false, problem: 'needsGrams' };
  }
  // a count: a portion whose label mentions the counted word
  if (!food.portions.length) return { qty: null, estimated: false, problem: 'needsGrams' };
  const w = row.countWord;
  const named = w ? food.portions.find((x) => fold(x.label).includes(w)) : undefined;
  // a named unit with no portion of that kind ("2 cups" on a food with only a scoop) is not swapped for another portion
  if (w && !named) return { qty: null, estimated: false, problem: 'needsGrams' };
  const p = named || food.portions[0];
  // a database's stand-in "serving (100 g)" is not one of the thing: "10 corn cakes" must not become 10 × 100 g
  if (!named && placeholderPortion(p, food.basis)) return { qty: null, estimated: false, problem: 'needsGrams' };
  return { qty: { amount: Math.round((row.amount / (named ? portionCount(p.label) : 1)) * 1000) / 1000, unit: 'portion', portionId: p.id }, estimated: !p.verified };
}
