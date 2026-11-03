/**
 * A phrase grammar for the parser: it builds spoken phrases (English, Danish, mixed) with the answer known in advance,
 * so millions can be checked. Seeded, so a failure can be replayed: `gen(seed)` always gives the same phrase.
 *
 * Families: sets, corrections, commands, rest time, water, body weight, food, talk that must never log, half-said
 * phrases, and noise (random word soup: it may read as anything, but must never crash, freeze or log nonsense).
 */
import type { Expect } from '../dictation.corpus';

export interface Phrase { family: Family; say: string; open: boolean; expect: Expect }
export type Family = 'set' | 'correction' | 'command' | 'rest' | 'water' | 'bodyweight' | 'food' | 'workout' | 'talk' | 'halfsaid' | 'noise';
export const FAMILIES: Family[] = ['set', 'correction', 'command', 'rest', 'water', 'bodyweight', 'food', 'workout', 'talk', 'halfsaid', 'noise'];
/** How often each family is drawn (out of 100). */
const MIX: Record<Family, number> = { set: 18, correction: 12, command: 10, rest: 6, water: 8, bodyweight: 8, food: 14, workout: 6, talk: 8, halfsaid: 6, noise: 4 };

// ── seeded random ──
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
  const chance = (p: number) => next() < p;
  return { next, int, pick, chance };
}
type R = ReturnType<typeof rng>;

// ── numbers in words ──
const EN_U = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_T = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const DA_U = ['nul', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten', 'seksten', 'sytten', 'atten', 'nitten'];
const DA_T = ['', '', 'tyve', 'tredive', 'fyrre', 'halvtreds', 'tres', 'halvfjerds', 'firs', 'halvfems'];
function en(n: number, r: R): string {
  if (n < 20) return EN_U[n];
  if (n < 100) return EN_T[Math.floor(n / 10)] + (n % 10 ? ` ${EN_U[n % 10]}` : '');
  if (n >= 1000) return String(n);
  const h = Math.floor(n / 100), rest = n % 100;
  if (h === 1 && rest >= 20 && r.chance(0.3)) return `one ${en(rest, r)}`; // "one forty"
  if (h > 1 && rest >= 20 && rest % 10 === 0 && r.chance(0.2)) return `${EN_U[h]} ${EN_T[rest / 10]}`; // "two fifty"
  return `${h === 1 && r.chance(0.3) ? 'a' : EN_U[h]} hundred${rest ? ` and ${en(rest, r)}` : ''}`;
}
function da(n: number, r: R): string {
  if (n < 20) return DA_U[n];
  if (n < 100) return n % 10 ? `${DA_U[n % 10]} og ${DA_T[Math.floor(n / 10)]}` : DA_T[n / 10];
  if (n >= 1000) return String(n);
  const h = Math.floor(n / 100), rest = n % 100;
  return `${h === 1 ? (r.chance(0.5) ? 'et' : '') : DA_U[h]} hundrede${rest ? ` og ${da(rest, r)}` : ''}`.trim();
}
/** A whole number as digits or words. 1 and 2 stay digits in Danish ("en", "to" are ordinary words). */
function say(n: number, r: R, lang: 'en' | 'da', wordy: number): string {
  if (!Number.isInteger(n)) throw new Error('say(): whole numbers only');
  if (!r.chance(wordy) || n === 0) return String(n);
  if (lang === 'da' && n < 3) return String(n);
  return lang === 'en' ? en(n, r) : da(n, r);
}
/** A weight with a decimal part, said one of several ways. */
function sayWeight(w: number, r: R, lang: 'en' | 'da', wordy: number): string {
  if (Number.isInteger(w)) return say(w, r, lang, wordy);
  const whole = Math.trunc(w), frac = Math.round((w - whole) * 100);
  if (frac === 50) {
    const k = r.int(0, 4);
    if (k === 0) return `${whole}.5`;
    if (k === 1) return `${whole},5`;
    if (k === 2) return `${say(whole, r, lang, wordy)} ${lang === 'en' ? 'point' : 'komma'} ${r.chance(wordy) ? (lang === 'en' ? 'five' : 'fem') : '5'}`;
    if (k === 3) return `${say(whole, r, lang, wordy)} ${lang === 'en' ? 'and a half' : 'og en halv'}`;
    return `${whole} ${lang === 'en' ? 'point' : 'komma'} 5`;
  }
  return r.chance(0.5) ? `${whole}.${frac}` : `${whole},${frac}`;
}

// ── wrappers: filler, lead-ins, punctuation ──
const PRE = ['', '', '', '', '', 'uh ', 'um ', 'ok ', 'okay so ', 'like ', 'so ', 'altså ', 'øh ', 'yeah ', 'well ', 'ja '];
const POST = ['', '', '', '', '', ' please', ' tak', ' yeah', ' ja', '.', '!', ' okay', ' ok'];
const FILL = ['uh', 'um', 'øh', 'like', 'altså', 'ok'];
function wrap(core: string, r: R, lead: readonly string[] = []): string {
  let t = core;
  if (lead.length && r.chance(0.25)) t = `${r.pick(lead)} ${t}`;
  t = r.pick(PRE) + t + r.pick(POST);
  if (r.chance(0.12)) { // a filler word dropped in at a word break
    const w = t.split(' ');
    w.splice(r.int(0, w.length), 0, r.pick(FILL));
    t = w.join(' ');
  }
  if (r.chance(0.1)) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}
const SET_LEAD = ['i did', 'that was', 'just did', 'jeg tog', 'det var', 'did', 'i got'];

// ── sets ──
const KG_EN = ['kg', 'kilos', 'kilograms', 'kilo'];
const KG_DA = ['kg', 'kilo', 'kilogram', 'kilo'];
const REP_EN = ['reps', 'repetitions', 'reps', 'times'];
const REP_DA = ['gange', 'gentagelser', 'gange', 'reps'];
const weights = [20, 25, 30, 35, 40, 45, 50, 55, 60, 62.5, 65, 70, 72.5, 75, 80, 82.5, 85, 90, 92.5, 95, 100, 105, 110, 115, 120, 125, 130, 140, 150, 160, 180, 200];

interface SetBits { w: number; r: number; wText: string; rText: string; wUnit: string; rUnit: string; lang: 'en' | 'da' }
function setBits(r: R): SetBits {
  const lang = r.pick(['en', 'da'] as const);
  const wordy = r.pick([0, 0, 0.3, 1]);
  const w = r.pick(weights), reps = r.int(1, 30);
  const numLang = r.chance(0.15) ? (lang === 'en' ? 'da' : 'en') : lang; // mixed: Danish numbers in an English sentence
  return {
    w, r: reps, lang,
    wText: sayWeight(w, r, numLang, wordy), rText: say(reps, r, numLang, wordy),
    wUnit: r.pick(lang === 'en' ? KG_EN : KG_DA), rUnit: r.pick(lang === 'en' ? REP_EN : REP_DA),
  };
}
/** A full set phrase (both numbers) in one of the usual orders. */
function setPhrase(b: SetBits, r: R): string {
  const unit = r.chance(0.5), reps = r.chance(0.4);
  const W = unit ? `${b.wText} ${b.wUnit}` : b.wText;
  const Rp = reps && b.r !== 1 ? `${b.rText} ${b.rUnit}` : b.rText;
  const bothLabelled = `${b.wText} ${b.wUnit}`; // forms that need both labels
  const repLabelled = b.r !== 1 ? `${b.rText} ${b.rUnit}` : b.rText;
  switch (r.int(0, 8)) {
    case 0: return `${Rp} ${b.lang === 'en' ? 'at' : r.pick(['på', 'med'])} ${W}`;
    case 1: return `${W} ${b.lang === 'en' ? 'for' : r.pick(['til', 'for'])} ${Rp}`;
    case 2: return `${bothLabelled} ${r.pick(b.lang === 'en' ? ['', 'and ', 'with '] : ['', 'og ', 'med '])}${b.r !== 1 ? repLabelled : `${b.rText} ${b.rUnit}`}`.replace(/\s+/g, ' ');
    case 3: return `${b.r !== 1 ? repLabelled : `${b.rText} ${b.rUnit}`} ${r.pick(b.lang === 'en' ? ['', 'of ', 'with ', 'at '] : ['', 'af ', 'med ', 'på '])}${bothLabelled}`.replace(/\s+/g, ' ');
    case 4: return `${Rp} ${b.lang === 'en' ? 'at' : 'på'} ${W}`;
    case 5: return `${W} ${b.lang === 'en' ? 'for' : 'for'} ${Rp}`;
    case 6: return `${Rp} @ ${W}`;
    case 7: return `${W}, ${Rp}`.replace(/^(.*), (.*)$/, `${W} for ${Rp}`);
    default: return `${W} ${b.lang === 'en' ? 'for' : 'til'} ${Rp}`;
  }
}

function genSet(r: R): Phrase {
  const b = setBits(r);
  return { family: 'set', say: wrap(setPhrase(b, r), r, SET_LEAD), open: true, expect: { set: [b.r, b.w] } };
}

// ── corrections ──
const NO = ['no', 'nej', 'no wait', 'nej vent', 'sorry', 'actually', 'i mean', 'jeg mener', 'no sorry', 'nej undskyld', 'uh no', 'øh nej'];
function genCorrection(r: R): Phrase {
  const a = setBits(r), b = setBits(r);
  a.lang = b.lang; // one language per sentence
  const kind = r.int(0, 4);
  if (kind === 4) { // pounds, corrected by a bare decimal: the decimal is in pounds too
    const lb = r.int(60, 400), dec = lb + r.pick([0.5, 2.5, 5.5]), reps = r.int(2, 12);
    return { family: 'correction', say: wrap(`${reps} at ${lb} ${r.pick(['lb', 'lbs', 'pounds'])} ${r.pick(NO).replace(/^(uh|øh) /, '')} ${dec}`, r), open: true, expect: { set: [reps, dec * 0.45359237] } };
  }
  const first = setPhrase(a, r), marker = r.pick(NO).replace(/^(uh|øh) /, '');
  if (kind === 0) return { family: 'correction', say: wrap(`${first} ${marker} ${setPhrase(b, r)}`, r), open: true, expect: { set: [b.r, b.w] } }; // a whole new set wins
  if (kind === 1) { // only the reps change: the number says "reps"
    const rep = b.r === 1 ? '2' : b.rText;
    return { family: 'correction', say: wrap(`${first} ${marker} ${rep} ${b.rUnit}`, r), open: true, expect: { set: [b.r === 1 ? 2 : b.r, a.w] } };
  }
  if (kind === 2) { // only the weight changes: the number says the unit
    return { family: 'correction', say: wrap(`${first} ${marker} ${b.wText} ${b.wUnit}`, r), open: true, expect: { set: [a.r, b.w] } };
  }
  // a bare whole number against reps AND kilos: never choose, ask
  return { family: 'correction', say: wrap(`${first} ${marker} ${r.int(2, 140)}`, r), open: true, expect: { ask: true } };
}

// ── commands ──
const CMD: [string, 'same' | 'done' | 'skip' | 'undo'][] = [
  ['same again', 'same'], ['same', 'same'], ['same as last time', 'same'], ['same thing again', 'same'], ['samme igen', 'same'], ['det samme igen', 'same'], ['same as before', 'same'], ['igen', 'same'], ['again', 'same'],
  ['done', 'done'], ['set done', 'done'], ['finished', 'done'], ['færdig', 'done'], ['færdig med sættet', 'done'], ['done with that set', 'done'], ['klar', 'done'], ['next set', 'done'],
  ['skip', 'skip'], ['skip it', 'skip'], ['skip this set', 'skip'], ['skip that set', 'skip'], ['spring over', 'skip'], ['spring over det', 'skip'], ['drop it', 'skip'],
  ['undo', 'undo'], ['undo that', 'undo'], ['undo the last one', 'undo'], ['undo the last set', 'undo'], ['fortryd', 'undo'], ['fortryd det', 'undo'], ['annuller', 'undo'], ['fortryd den sidste', 'undo'],
];
function genCommand(r: R): Phrase {
  const [text, cmd] = r.pick(CMD);
  return { family: 'command', say: wrap(text, r), open: cmd !== 'undo' || r.chance(0.5), expect: { cmd } };
}

function genRest(r: R): Phrase {
  const lang = r.pick(['en', 'da'] as const);
  const mins = r.chance(0.3);
  const n = mins ? r.int(1, 5) : r.pick([5, 10, 15, 20, 30, 45, 60, 90, 120]);
  const num = say(n, r, lang, 0.3);
  const unit = mins ? (lang === 'en' ? r.pick(['minutes', 'min', 'minute']) : r.pick(['minutter', 'minut', 'min'])) : (lang === 'en' ? r.pick(['seconds', 'sec', 'seconds']) : 'sekunder');
  const verb = lang === 'en' ? r.pick(['add', 'plus', 'add', '+']) : r.pick(['tilføj', 'plus', 'giv mig']);
  const plusOk = verb !== '+' || /^\d+$/.test(num);
  const fixed = mins && n === 1 && unit === 'minute' ? 'minute' : unit;
  return { family: 'rest', say: wrap(`${plusOk ? verb : 'add'}${verb === '+' && plusOk ? '' : ' '}${num} ${mins && n === 1 && lang === 'en' ? fixed : unit}`, r), open: true, expect: { rest: mins ? n * 60 : n } };
}

// ── water ──
function genWater(r: R): Phrase {
  const lang = r.pick(['en', 'da'] as const);
  const kind = r.int(0, 3);
  const lead = lang === 'en' ? r.pick(['', 'i drank ', 'drank ', 'i just drank ', 'had ']) : r.pick(['', 'jeg drak ', 'jeg har drukket ', 'drak lige ']);
  const water = lang === 'en' ? 'water' : 'vand';
  const of = lang === 'en' ? ' of ' : ' ';
  let text: string, ml: number;
  if (kind === 0) { const n = r.pick([100, 150, 200, 250, 300, 330, 400, 500, 600, 750, 1000]); ml = n; text = `${say(n, r, lang, 0.3)} ${r.pick(lang === 'en' ? ['ml', 'milliliters', 'ml'] : ['ml', 'milliliter', 'ml'])}${of}${water}`; }
  else if (kind === 1) { const n = r.pick([0.5, 1, 1.5, 2, 2.5, 3]); ml = n * 1000; const num = Number.isInteger(n) ? say(n, r, lang, 0.3) : n === 0.5 && r.chance(0.5) ? '.5' : String(n).replace('.', r.chance(0.5) ? ',' : '.'); /* ".5 l" is half a litre */ text = `${num} ${r.pick(lang === 'en' ? ['liters', 'litres', 'l'] : ['liter', 'l'])}${of}${water}`; }
  else if (kind === 2) { const n = r.int(1, 6); ml = n * 250; text = `${say(n, r, lang, 0.3)} ${n === 1 ? (lang === 'en' ? 'glass' : 'glas') : (lang === 'en' ? 'glasses' : 'glas')}${of}${water}`; }
  else { const n = r.int(1, 3); ml = n * 500; text = `${say(n, r, lang, 0.3)} ${n === 1 ? (lang === 'en' ? 'bottle' : 'flaske') : (lang === 'en' ? 'bottles' : 'flasker')}${of}${water}`; }
  return { family: 'water', say: wrap(lead + text, r), open: r.chance(0.5), expect: { water: ml } };
}

// ── body weight ──
function genBodyweight(r: R): Phrase {
  const lang = r.pick(['en', 'da'] as const);
  const kg = r.int(55, 120) + r.pick([0, 0, 0.5, 0.2, 0.8, 0.4]);
  const body = Number.isInteger(kg) || r.chance(0.5) ? sayWeight(kg, r, lang, 0.25) : String(kg).replace('.', r.chance(0.5) ? ',' : '.');
  const unit = r.pick(['', ' kg', ' kilos', ' kilo']);
  const cue = lang === 'en' ? r.pick(['i weigh ', 'my weight is ', 'weight ', 'bodyweight ', 'i weighed in at ', 'my weight this morning was ', 'weight today ']) : r.pick(['jeg vejer ', 'vægt ', 'min vægt er ', 'vægten er ', 'jeg vejede ', 'jeg vejer ']);
  return { family: 'bodyweight', say: wrap(`${cue}${body}${unit}`, r), open: r.chance(0.5), expect: { bw: kg } };
}

// ── food ──
const FOODS_EN = ['chicken breast', 'rice', 'skyr', 'oats', 'greek yogurt', 'salmon', 'broccoli', 'pasta', 'cheese', 'almonds', 'peanut butter', 'cottage cheese', 'sweet potato', 'tuna', 'dulce de leche'];
const FOODS_DA = ['kylling', 'ris', 'skyr', 'havregryn', 'kvark', 'laks', 'broccoli', 'pasta', 'ost', 'mandler', 'peanutbutter', 'rugbrød', 'tun', 'is', 'kylling i karry', 'is med jordbær'];
const LIQ_EN = ['milk', 'orange juice', 'cola', 'oat milk'];
const LIQ_DA = ['mælk', 'juice', 'cola', 'havremælk'];
const COUNT_EN: [string, string[]][] = [['egg', ['egg', 'eggs']], ['banana', ['banana', 'bananas']], ['apple', ['apple', 'apples']], ['rice cake', ['rice cake', 'rice cakes']]];
const COUNT_DA: [string, string[]][] = [['æg', ['æg', 'æg']], ['banan', ['banan', 'bananer']], ['æble', ['æble', 'æbler']]];
interface Row { text: string; amount: number; dim: 'g' | 'ml' | 'count'; q: string }
function foodRow(r: R, lang: 'en' | 'da'): Row {
  const k = r.int(0, 3);
  if (k === 0) { // grams
    const g = r.pick([20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 125, 150, 175, 200, 250, 300, 400, 500]);
    const food = r.pick(lang === 'en' ? FOODS_EN : FOODS_DA);
    const unit = r.pick(lang === 'en' ? ['g', 'grams', 'gram', 'g'] : ['g', 'gram', 'gram', 'g']);
    const num = unit === 'g' && r.chance(0.5) ? `${g}g` : `${say(g, r, lang, 0.25)} ${unit}`;
    return { text: `${num} ${lang === 'en' && r.chance(0.4) ? 'of ' : ''}${food}`, amount: g, dim: 'g', q: food };
  }
  if (k === 1) { // millilitres
    const food = r.pick(lang === 'en' ? LIQ_EN : LIQ_DA);
    const dl = r.chance(0.5);
    const n = dl ? r.pick([1, 2, 3, 5]) : r.pick([100, 150, 200, 250, 300, 500]);
    const unit = dl ? 'dl' : 'ml';
    return { text: `${dl ? say(n, r, lang, 0.3) : n} ${unit} ${food}`, amount: dl ? n * 100 : n, dim: 'ml', q: food };
  }
  if (k === 2) { // counted foods
    const [q, forms] = r.pick(lang === 'en' ? COUNT_EN : COUNT_DA);
    const n = r.int(2, 6);
    return { text: `${say(n, r, lang, 0.3)} ${forms[1]}`, amount: n, dim: 'count', q };
  }
  const n = r.int(2, 4); // slices
  const food = lang === 'en' ? r.pick(['bread', 'toast', 'pizza']) : r.pick(['rugbrød', 'brød', 'pizza']);
  return { text: `${say(n, r, lang, 0.3)} ${lang === 'en' ? 'slices of' : 'skiver'} ${food}`, amount: n, dim: 'count', q: food };
}
function genFood(r: R): Phrase {
  const lang = r.pick(['en', 'da'] as const);
  const rows = Array.from({ length: r.pick([1, 1, 1, 2, 2, 3]) }, () => foodRow(r, lang));
  const sep = () => r.pick(lang === 'en' ? [', ', ' and ', ' and ', ', '] : [', ', ' og ', ' og ', ', ']);
  let text = rows.map((x) => x.text).reduce((acc, t, i) => (i ? acc + sep() + t : t), '');
  const lead = r.pick(lang === 'en' ? ['', '', 'i ate ', 'i had ', 'ate ', 'log '] : ['', '', 'jeg spiste ', 'jeg har spist ', 'spiste ']);
  const meals: [string, string][] = lang === 'en' ? [['', ''], ['', ''], [' for breakfast', 'breakfast'], [' for lunch', 'lunch'], [' for dinner', 'dinner'], [' as a snack', 'snack']] : [['', ''], ['', ''], [' til morgenmad', 'breakfast'], [' til frokost', 'lunch'], [' til aftensmad', 'dinner'], [' som snack', 'snack']];
  const [suffix, meal] = r.pick(meals);
  text = lead + text + suffix;
  return { family: 'food', say: wrap(text, r), open: r.chance(0.3), expect: { food: rows.map((x) => [x.amount, x.dim, x.q] as [number, 'g' | 'ml' | 'count', string]), ...(meal ? { meal } : {}) } };
}

// ── exercises with their sets, one to three in a phrase ──
const LIFTS: [string, string][] = [['squat', 'back squat'], ['back squat', 'back squat'], ['front squat', 'front squat'], ['bench press', 'barbell bench press'], ['bench', 'barbell bench press'], ['dumbbell bench press', 'dumbbell bench press'], ['deadlift', 'deadlift'], ['romanian deadlift', 'romanian deadlift'], ['rdl', 'romanian deadlift'], ['overhead press', 'overhead press'], ['barbell row', 'barbell row'], ['skulderpres', 'overhead press'], ['dødløft', 'deadlift']];
function liftSets(r: R): { text: string; sets: [number, number][] } {
  const w = r.pick(weights), reps = r.int(3, 15), unit = r.pick(['', '', ' kg', ' kilos']);
  switch (r.int(0, 3)) {
    case 0: return { text: `${w}${unit} for ${reps}`, sets: [[reps, w]] };
    case 1: return { text: `${reps} reps at ${w}${unit || ' kg'}`, sets: [[reps, w]] };
    case 2: { const n = r.int(2, 5); return { text: `${n} sets of ${reps} at ${w}${unit}`, sets: Array.from({ length: n }, () => [reps, w] as [number, number]) }; }
    default: { const more = [reps - 1, reps - 2].filter((x) => x > 0); return { text: `${w}${unit} for ${reps}, ${more.join(' and ')}`, sets: [[reps, w], ...more.map((x) => [x, w] as [number, number])] }; }
  }
}
function genWorkout(r: R): Phrase {
  if (r.chance(0.2)) { // a run with distance and time: a connector ("in", "på") never splits it in two (Codex on #64)
    const km = r.int(2, 21), min = r.int(10, 120), da = r.chance(0.3);
    const say = da ? `løb ${km} km${r.pick([' på ', ', på '])}${min} minutter` : `run ${km} km${r.pick([' in ', ', in ', ' and in '])}${min} minutes`;
    return { family: 'workout', say: wrap(say, r), open: r.chance(0.5), expect: { run: [km, min * 60] } };
  }
  const n = r.pick([1, 2, 2, 3]);
  const picked: [string, string][] = [];
  while (picked.length < n) { const l = r.pick(LIFTS); if (!picked.some((p) => p[1] === l[1])) picked.push(l); }
  const parts = picked.map(([said, name]) => { const s = liftSets(r); return { text: `${said} ${s.text}`, name, sets: s.sets }; });
  const text = parts.map((p) => p.text).reduce((acc, t, i) => (i ? acc + r.pick([' and ', ', ', ' og ', ' then ', ' and then ', '. ', '; ']) + t : t), '');
  return { family: 'workout', say: wrap(text, r), open: r.chance(0.5), expect: { workouts: parts.map((p) => [p.name, p.sets] as [string, [number, number][]]) } };
}

// ── talk that must never log ──
const N = (r: R) => { const n = r.int(2, 99); return r.chance(0.3) ? en(n, r) : String(n); };
const TALK: ((r: R) => string)[] = [
  (r) => `i have ${N(r)} exams tomorrow`, (r) => `the gym closes at ${N(r)}`, (r) => `i slept ${r.int(4, 10)} hours`, (r) => `it costs ${N(r)} kroner`,
  (r) => `my friend weighs ${r.int(60, 110)} kilos`, (r) => `jeg har ${r.int(2, 6)} timer i skole`, (r) => `i paid ${N(r)} for it`, (r) => `the video got ${N(r)} thousand views`,
  (r) => `jeg skal hjem klokken ${r.int(2, 11)}`, (r) => `i will do ${N(r)} for ${r.int(5, 12)} later`, (r) => `i should eat ${N(r)} grams of rice later`, (r) => `my bench is ${r.int(60, 120)} kilos`,
  (r) => `i want to squat ${r.int(100, 180)} kilos someday`, (r) => `what is ${N(r)} plus ${N(r)}`, (r) => `can you hear me ${r.int(1, 3)} times`, (r) => `i need ${r.int(5, 20)} minutes`,
  (r) => `${N(r)} people are in the gym`, (r) => `the bus leaves in ${r.int(2, 30)} minutes`, (r) => `i have ${r.int(2, 9)} more sets`, (r) => `it is ${r.int(10, 30)} degrees outside`,
  () => `no problem`, () => `hey aven`, () => `that felt heavy`, () => `jeg er træt`, () => `what should i eat`, () => `how many sets are left`, () => `good morning`, () => `tak for hjælpen`,
  (r) => `i made ${r.int(2, 6)} sandwiches`, (r) => `i got ${r.int(2, 4)} dogs`, (r) => `i bought ${r.int(2, 12)} eggs`, (r) => `jeg købte ${r.int(2, 6)} bananer`, (r) => `i cooked ${r.int(200, 900)} grams of rice for the kids`, () => `2 eggs i think`,
  (r) => `${r.int(2, 6)} eggs i ${r.pick(['cooked', 'made', 'bought', 'saw'])}`, (r) => `${r.int(2, 5)} is ${r.pick(['enough', 'plenty', 'fine', 'too many'])}`, (r) => `${r.int(2, 6)} ${r.pick(['æg', 'bananer', 'boller'])} de ${r.pick(['smager godt', 'kostede meget', 'lå i køleskabet', 'blev brændt'])}`,
  (r) => `i lost ${r.int(1, 5)} kilos this month`, (r) => `my friend ate ${r.int(100, 400)} grams of pasta`, (r) => `the pizza was ${r.int(80, 150)} kroner`, (r) => `i ran ${r.int(2, 10)} km yesterday`,
];
function genTalk(r: R): Phrase { return { family: 'talk', say: wrap(r.pick(TALK)(r), r), open: r.chance(0.6), expect: { nolog: true } }; }

// ── half-said phrases: ending on a connector, never logged ──
const HALF: ((r: R) => string)[] = [
  (r) => `${r.int(20, 150)} for`, (r) => `${r.int(20, 150)} kilos for uh`, (r) => `${r.int(3, 15)} reps at`, (r) => `${r.int(20, 150)} for ${r.int(3, 12)} and`,
  (r) => `${r.int(3, 15)} reps with`, (r) => `${r.int(20, 150)} og`, (r) => `${r.int(20, 150)} kilo for`, (r) => `${r.int(20, 150)} x`, (r) => `${r.int(3, 15)} på`,
  (r) => `${r.int(20, 150)} gram`, (r) => `i ate ${r.int(100, 300)} grams of`, (r) => `${r.int(100, 500)} ml of`, (r) => `${r.int(3, 15)} reps and`,
];
function genHalf(r: R): Phrase { return { family: 'halfsaid', say: wrap(r.pick(HALF)(r), r), open: true, expect: { nolog: true } }; }

// ── noise: random word soup, must never crash, freeze, or log nonsense ──
const SOUP = ['80', '8', '100', '2.5', '82,5', '0', '999', '1e9', '-5', '½', 'eighty', 'two', 'hundred', 'thousand', 'to', 'en', 'tyve', 'og', 'and', 'point', 'komma', 'kg', 'kilos', 'g', 'ml', 'dl', 'reps', 'gange', 'for', 'at', 'på', 'x', '×', 'by', 'no', 'nej', 'undo', 'done', 'skip', 'same', 'add', 'plus', '+', 'seconds', 'minutes', 'water', 'vand', 'weigh', 'vægt', 'ate', 'spiste', 'a', 'of', 'bench', 'press', 'squat', 'eggs', 'chicken', 'rice', ',', '.', '…', '!', '?', '(', ')', '/', '1/2', '3/4', 'uh', 'like', 'æ', 'ø', 'å', ' ', 'hundrede', 'og', 'halvtreds', 'half', 'halv', 'liter', 'glass'];
function genNoise(r: R): Phrase {
  const len = r.int(1, 40), parts: string[] = [];
  for (let i = 0; i < len; i++) parts.push(r.pick(SOUP));
  return { family: 'noise', say: parts.join(r.chance(0.8) ? ' ' : r.pick(['', ',', ' , ', '  '])), open: r.chance(0.5), expect: { nolog: true } };
}

const GEN: Record<Family, (r: R) => Phrase> = { set: genSet, correction: genCorrection, command: genCommand, rest: genRest, water: genWater, bodyweight: genBodyweight, food: genFood, workout: genWorkout, talk: genTalk, halfsaid: genHalf, noise: genNoise };

/** Phrase number `i` of seed `seed`: always the same one. */
export function gen(seed: number, i: number): Phrase {
  const r = rng((seed * 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b));
  let roll = r.int(1, 100);
  for (const f of FAMILIES) { roll -= MIX[f]; if (roll <= 0) return GEN[f](r); }
  return genSet(r);
}
