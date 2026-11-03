/**
 * Food words: "200 grams of skyr, one banana and 60 grams of oats" → rows of amount + unit + what. No food database
 * here (that is a later phase): the parser only reads what was said, and a row it cannot place is handed back unread
 * instead of guessed. Ported from old Aven's foodText.ts (parseFoodText, rowQuantity, density table), with:
 *  - a row needs an amount said out loud ("a banana" counts, a bare "banana" does not: that could be anything);
 *  - the unit table also understands Danish spellings after æøå folding ("dåse", "håndfuld").
 */
import { fold, NUMBER_WORDS, mergeNumberWords as mergeWords } from './words';

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
  tbsp: { kind: 'ml', f: 15 }, tablespoon: { kind: 'ml', f: 15 }, spsk: { kind: 'ml', f: 15 }, spiseske: { kind: 'ml', f: 15 }, spiseskefuld: { kind: 'ml', f: 15 }, spiseskefulde: { kind: 'ml', f: 15 }, teskefuld: { kind: 'ml', f: 5 }, teskefulde: { kind: 'ml', f: 5 },
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
  // "two hundred and fifty" is one number, not two foods
  const t = text.replace(/(\d),(\d)/g, '$1.$2').replace(/\b(hundred|hundrede)\s+(?:and|og)\s+/gi, '$1 ').replace(/\s+/g, ' ').trim();
  const AMOUNT_UNIT = '\\d+(?:\\.\\d+)?\\s?(?:g|gr|gram|grams|kg|ml|cl|dl|l|liter|litre|tbsp|tsp|spsk|tsk)\\b';
  // a second "150 gram …" after a first one that already has its amount starts a new row: "200 gram kylling 150 gram ris"
  const t2 = t.replace(new RegExp(`^(${AMOUNT_UNIT}\\s+[^\\d,;]+?)\\s+(?=${AMOUNT_UNIT})`, 'i'), '$1, ');
  return t2
    .split(/\s*(?:[,;]|\.\s+|\.$|\band\b|\bog\b|\bplus\b|\bthen\b|\bsamt\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Counted things that are never food: "8 reps", "30 seconds", "2 minutes", "80 kroner". */
const NOT_FOOD = new Set(['rep', 'reps', 'set', 'sets', 'second', 'seconds', 'sec', 'secs', 'sekund', 'sekunder', 'minute', 'minutes', 'min', 'mins', 'minut', 'minutter', 'hour', 'hours', 'time', 'times', 'timer', 'day', 'days', 'dag', 'dage', 'week', 'weeks', 'uge', 'uger', 'year', 'years', 'aar', 'kr', 'kroner', 'dkk', 'euro', 'dollar', 'dollars', 'km', 'kilometer', 'kilometers', 'kilometre', 'kilometres', 'meter', 'meters', 'mile', 'miles', 'views', 'likes', 'comments', 'subscribers', 'followers', 'gange', 'gentagelser', 'repetitions']);
/** Verbs and pronouns: a food name has none, so a phrase holding one is a sentence. */
/** Words that make the rest a clause, not a food name, in either language ("27 people are in the gym", "2 eggs i think"). */
const SENTENCE_WORD = new Set(['are', 'was', 'were', 'am', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'you', 'we', 'they', 'he', 'she', 'it', 'jeg', 'du', 'vi', 'han', 'hun', 'det', 'er', 'var', 'har', 'skal', 'vil', 'kan', 'people', 'persons', 'friends', 'guys', 'kids']);
/** What can follow "i" in a Danish dish name ("kylling i karry", "laks i ovn"): a sauce, a cut, a pan. Any other "i" is English "I". */
const DISH_AFTER_I = /^(?:karry|karrysovs|sovs|sauce|flødesovs|tomatsovs|tomat|tomater|olie|olivenolie|lage|eddike|fad|ovn|ovnen|skiver|tern|både|strimler|kokosmælk|mælk|smør|svøb|dej|gele|sirup|chili|hvidløg|vaffel)$/;
/** A first "is" is Danish ice cream only on its own or when the name goes on like a dish ("is med jordbær"), never "2 is enough". */
const ICE_CREAM_NEXT = /^(?:med|og|i|uden|fra)$/;
/** Foreign dish names with "de" ("dulce de leche", "fleur de sel"): what can follow it. Any other "de" is Danish "they". */
const DISH_AFTER_DE = /^(?:leche|sel|provence|mie|campagne|bruxelles|pollo|queso|gallo|nata|la)$/;
/**
 * "is", "i" and "de" are sentence words in one language and food words in the other: Danish "is" is ice cream,
 * "kylling i karry" is chicken in curry, "dulce de leche" is a food. They count as food words only in a dish's shape;
 * anywhere else they make the row a sentence (conservative: a missed food can be typed again, a wrong log is worse).
 */
function isClause(name: string[]): boolean {
  return name.some((t, k) => SENTENCE_WORD.has(t)
    || (t === 'is' && (k > 0 || (name.length > 1 && !ICE_CREAM_NEXT.test(name[1])))) // "2 eggs is all", "2 is enough"
    || (t === 'i' && !(k > 0 && k < name.length - 1 && DISH_AFTER_I.test(name[k + 1]))) // "2 eggs i cooked", not "kylling i karry"
    || (t === 'de' && !(k > 0 && k < name.length - 1 && DISH_AFTER_DE.test(name[k + 1])))); // "2 bananer de er gode", not "dulce de leche"
}
const PREPOSITION = new Set(['for', 'at', 'with', 'and', 'to', 'til', 'med', 'på', 'paa', 'in', 'i', 'og', 'on', 'by', 'from', 'fra']);
/** The most one row can hold (grams or ml): 5 kg. Above that a weight or a slip, not a meal. */
const MAX_AMOUNT = 5000;

/** One spoken segment as a row, or null when no amount was said or no food was named. */
function readRow(seg: string): FoodRow | null {
  const words = mergeWords(seg.toLowerCase().replace(/[.]$/, '').split(/\s+/), true);
  let i = 0;
  let amount: number | undefined;
  const numTok = words[i];
  const frac = numTok.match(/^(\d+)\/(\d+)$/);
  const glued = numTok.match(/^(\d+(?:\.\d+)?)([a-zæøå]+)$/); // "200g"
  if (frac && Number(frac[2]) > 0) { amount = Number(frac[1]) / Number(frac[2]); i++; }
  else if (/^\d+(\.\d+)?$/.test(numTok)) { amount = Number(numTok); i++; }
  else if (glued && UNITS[fold(glued[2])]) { amount = Number(glued[1]); words.splice(i, 1, glued[1], glued[2]); i++; }
  else if (WORD_NUM[numTok] !== undefined && words.length > 1) { amount = WORD_NUM[numTok]; i++; }
  else if (NUMBER_WORDS[numTok] !== undefined && words.length > 1) { amount = NUMBER_WORDS[numTok]; i++; } // "tyve gram", "twenty grams"
  // "et halvt kilo", "en halv liter": a Danish half is one word after the article
  if (amount === 1 && /^(?:en|et)$/.test(numTok) && /^halv[te]?$/.test(words[i] ?? '')) { amount = 0.5; i++; }
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
  if (/\b(?:for|at|på|paa|med|with)\s+(?:\d|(?:one|two|three|four|five|six|seven|eight|nine|ten|en|et|to|tre|fire|fem|seks|syv|otte|ni|ti)\b)/.test(query)) return null; // "for three", "at 80": the end of a set phrase, not a food
  const nameWords = words.slice(i);
  if (nameWords.every((t) => t.replace(/[^\p{L}\p{N}]/gu, '').length < 2)) return null; // "83 x": a stray letter or sign is not a food
  if (isClause(nameWords)) return null; // "27 people are in the gym": a clause, not a food name
  if (PREPOSITION.has(words[i] ?? '')) return null; // "80 for", "8 at …": the rest of a sentence, not a food
  if (NOT_FOOD.has(words[i] === 'of' ? '' : fold(words[i] ?? ''))) return null; // "8 reps", "30 seconds", "2 minutes": a count of something that is not food
  if ((dim === 'g' || dim === 'ml') && amount * factor > MAX_AMOUNT) return null; // 100 000 g is a weight lifted, not a meal
  if (words.slice(i).some((t) => /^(?:hundred|hundrede|thousand|tusind)$/.test(t))) return null; // a big number word left over was not understood
  if (hasAmount(words.slice(i))) return null; // another amount and unit inside the name ("skyr 60 grams oats") was not understood
  return { raw: seg, amount: Math.round(amount * factor * 1000) / 1000, dim, ...(countWord ? { countWord } : {}), query, ...(weak ? { weak: true as const } : {}) };
}

/** Is there a number with a unit ("60 grams", "60g") among these words? Then a second food was run into the first. */
function hasAmount(words: string[]): boolean {
  return words.some((t, j) => {
    const glued = t.match(/^\d+(?:\.\d+)?([a-zæøå]+)$/);
    return (glued && !!unitOf(fold(glued[1]))) || (/^\d+(?:\.\d+)?$/.test(t) && !!words[j + 1] && !!unitOf(fold(words[j + 1])));
  });
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
const plainLabel = (label: string) => fold(label.toLowerCase().replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, w, a, b) => String(Number(w) + Number(a) / Number(b))).replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => String(Number(a) / Number(b))).replace(/(\d),(\d)/g, '$1.$2'));
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

/** Does a portion's label name this counted unit, in either language? "1 skive (40 g)" names a slice. */
function labelHasCountWord(label: string, word: string): boolean {
  return plainLabel(label).split(' ').some((t) => { const u = unitOf(t); return u?.kind === 'count' && u.word === word; });
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
  const named = w ? food.portions.find((x) => labelHasCountWord(x.label, w)) : undefined;
  // a named unit with no portion of that kind ("2 cups" on a food with only a scoop) is not swapped for another portion
  if (w && !named) return { qty: null, estimated: false, problem: 'needsGrams' };
  const p = named || food.portions[0];
  // a database's stand-in "serving (100 g)" is not one of the thing: "10 corn cakes" must not become 10 × 100 g
  if (!named && placeholderPortion(p, food.basis)) return { qty: null, estimated: false, problem: 'needsGrams' };
  return { qty: { amount: Math.round((row.amount / (named ? portionCount(p.label) : 1)) * 1000) / 1000, unit: 'portion', portionId: p.id }, estimated: !p.verified };
}
