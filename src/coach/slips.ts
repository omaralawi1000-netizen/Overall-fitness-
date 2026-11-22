/**
 * Live code checks on an answer (docs/COACH.md §8 "Cheap models first", lever 3). Three slips cheap models make and users
 * hate: an answer that only repeats what the screen shows, one that ignores what the person just said, and one that sends
 * the person away without answering when no stop sign applies. Pure functions: the app calls `findSlips` on the model's
 * text, and on a slip asks once more with `retryNote(slips)`; if the second answer slips too, it shows the plain
 * `fallback` with the "Think deeper" offer (never an automatic big-model call).
 *
 * These are cheap, readable rules, not a judge. They stay quiet when unsure: a wrong block costs the person a good answer,
 * a missed slip only costs the answer's polish. The exam measures both (docs/COACH.md).
 */
import { LOOKUP, MINOR, RISK } from './route';
import { numbersIn } from './untrusted';
import { isFollowUp } from './playbooks';

export type SlipId = 'only-repeats' | 'ignores-message' | 'sends-away' | 'minor-number';
export interface Slip { id: SlipId; reason: string }

const W = (list: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${list})(?![\\p{L}\\p{N}_])`, 'iu');

/** a next step, an offer or a question: the answer gives the person something to do or to say (English and Danish) */
const STEP = W(
  [
    'try', 'go', 'stay', 'stick', 'weigh in', 'i\'?ll', 'log your', 'add', 'keep', 'move', 'swap', 'skip', 'drop', 'cut', 'aim', 'start', 'next', 'tomorrow', 'tonight', 'this week', 'i\'?d', 'i would', 'let\'?s', 'you could', 'you can', 'should', 'want me to', 'shall', 'tell me', 'need to know', 'first i need', 'raise', 'lower', 
    'prøv', 'tag', 'bliv', 'spis', 'sov', 'hold', 'flyt', 'drop', 'næste', 'i morgen', 'i aften', 'jeg ville', 'skal vi', 'vil du', 'du kan', 'du bør', 'du skal', 'start', 'gør', 'lad', 'så først', 'fortæl', 'planen', 'hvile', 'giv det', 'ekstra', 'skal op', 'nemmeste', 'meal', 'måltid',
  ].join('|'),
);
/** stop signs the playbooks name that the routing regex may not (swelling, numbness, dizziness, chest, blood): a referral is the right answer to these */
const STOP_SIGN = W('swell\\w*|swollen|numb\\w*|tingl\\w*|dizz\\w*|faint\\w*|chest|blood|can\'?t (?:bend|walk|move|put weight)|hævel\\w*|hævet|følelsesløs\\w*|svimmel\\w*|besvim\\w*|bryst\\w*|blod\\w*');
/** the answer's only advice is to see someone else */
const REFERRAL = W('doctor|physio\\w*|dietitian|nutritionist|professional|specialist|gp|your coach|læge\\w*|fysioterapeut\\w*|diætist\\w*|kostvejleder\\w*|din træner|speciallæge');

const DAY_LOOKUP = W('what\'?s (?:on )?(?:today|tomorrow)|hvad står der|hvad er (?:planen|på planen)|hvad skal jeg (?:i dag|i morgen)');
const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean);

/**
 * What a person says that any coach must pick up, and the words an answer that did pick it up would use. A family fires
 * only when the message holds its cue; the answer then needs one of its words. Narrow on purpose: a vague overlap test flagged
 * 11 good answers of 150 and found no real slip.
 */
const MUST_ANSWER: { cue: RegExp; answer: RegExp; what: string }[] = [
  { what: 'the pain or injury', cue: W('pain\\w*|hurt(?:s|ing)?|sore|ache\\w*|injur\\w*|pop(?:ped)?|swollen|smert\\w*|ondt|skade\\w*|knæ\\p{L}*|hævet'), answer: W('pain|hurt\\w*|sore|ache|injur\\w*|joint|knee|shoulder|elbow|wrist|back|hip|ankle|stop|doctor|physio\\w*|smert\\w*|ondt|skade\\w*|knæ\\p{L}*|skulder\\p{L}*|læge\\w*|fysio\\w*|ryg') },
  { what: 'the bad sleep or tiredness', cue: W('slept|sleep\\w*|tired|exhausted|insomnia|søvn\\w*|træt\\w*|udmattet|sov'), answer: W('sleep\\w*|slept|rest\\w*|tired|night|wrecked|rough|recover\\w*|nap|søvn\\w*|træt\\w*|hvile\\w*|sov\\w*|restitution') },
  { what: 'the shift or the schedule clash', cue: W('(?:late|night|early)\\s+shifts?|nights?\\s+(?:all\\s+)?week|shift\\s+work|vagt\\w*|skiftehold'), answer: W('shift\\w*|night\\w*|late|early|schedule|vagt\\w*|nat|sen|tidlig\\w*|skift\\w*') },
  { what: 'the match, race or event they named', cue: W('match|game|race|kamp|løb|stævne|turnering|tournament|competition|konkurrence'), answer: W('match|game|race|kamp\\w*|løb\\w*|stævne|tournament|turnering|competition|konkurrence\\w*|taper|nedtrapning\\w*|event|weigh\\w*|vejning\\w*|hvornår|hour\\w*|eat|spis\\w*|meal|måltid\\w*|food|mad|carb\\w*|kulhydrat\\w*') },
  { what: 'the sickness', cue: W('sick|ill|fever|cold|flu|syg\\w*|feber|forkølet'), answer: W('sick|ill|fever|cold|flu|rest\\w*|recover\\w*|syg\\w*|feber|forkølet|hvile\\w*') },
];

/** a minor asking to lose weight: any body-weight or calorie figure is a slip, even the one they named (m06, 22 Nov: "before you aim for 3 kg") */
const CUT_TALK = W('cut\\w*|lose|losing|drop|lighter|slim\\w*|diet\\w*|weight class|weigh-?in\\w*|tabe\\w*|smide|slank\\w*|kur|vægtklasse\\p{L}*|indvejning\\p{L}*');
const ENERGY_FIGURE = /\d+(?:[.,]\d+)?\s*(?:kcal|calories|cal|kalorier)(?![\p{L}])/iu;
const MASS_FIGURE = /(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilo|lbs?|pounds?)(?![\p{L}])/giu;
/** a kilo figure is about body weight when its sentence talks about weight; a lifting load ("squat at 40 kg") is not */
const WEIGHT_TALK = W('cut\\w*|lose|losing|lighter|weigh\\w*|weight|aim|target|goal|drop|tabe\\w*|smide|vægt\\p{L}*|vej\\p{L}*|mål');
/** a calorie figure, a kilo figure in a sentence about weight, or the very number the person asked to lose */
function bodyFigure(text: string, talk: string): boolean {
  if (ENERGY_FIGURE.test(text)) return true;
  const theirs = new Set(numbersIn(talk));
  return text.split(/(?<=[.!?])\s+/).some((sentence) => [...sentence.matchAll(MASS_FIGURE)].some((m) => WEIGHT_TALK.test(sentence) || theirs.has(Number(m[1].replace(',', '.')))));
}

export interface SlipContext {
  /** the person's latest message; empty when the Coach speaks first */
  personText: string;
  /** every number the fact sheet holds (`sheetNumbers`) */
  sheetNumbers: number[];
  /** a memory that says the person is under 18 */
  minor?: boolean;
  /** the person's earlier messages in this talk ("my coach says I should" still continues a cut) */
  earlier?: string;
}

export function findSlips(say: string, ctx: SlipContext): Slip[] {
  const text = say.trim();
  const person = ctx.personText.trim();
  if (!text || text === '-' || !person) return [];
  const slips: Slip[] = [];
  const risky = RISK.test(person) || STOP_SIGN.test(person) || !!ctx.minor || MINOR.test(person);
  const sheet = new Set(ctx.sheetNumbers.map((n) => Math.round(n * 10) / 10));
  const usedSheet = new Set(numbersIn(text).map((n) => Math.round(n * 10) / 10).filter((n) => sheet.has(n) && n > 1));
  const step = STEP.test(text) || text.includes('?');

  // 1. only repeats the screen: three or more of the sheet's own figures (not the person's own, not small ones) and nothing for
  // the person to do or answer
  const own = new Set(numbersIn(person));
  const shown = [...usedSheet].filter((n) => !own.has(n) && (n >= 10 || !Number.isInteger(n)));
  if (!LOOKUP.test(person) && !DAY_LOOKUP.test(person) && shown.length >= 3 && !step) {
    slips.push({ id: 'only-repeats', reason: 'it only repeats numbers the person can already see, with no next step or question' });
  }
  // 2. ignores what was said: a cue the person gave (pain, sleep, a shift, an event, sickness, quitting) and nothing of it in the answer
  const missed = MUST_ANSWER.find((m) => m.cue.test(person) && !m.answer.test(text));
  if (missed) slips.push({ id: 'ignores-message', reason: `it does not pick up ${missed.what} that the person just mentioned` });
  // 3. sends away: the only advice is to see someone else, with no figure and no step, and no stop sign in the message
  if (!risky && REFERRAL.test(text) && wordsOf(text).length <= 60 && usedSheet.size === 0 && !STEP.test(text.replace(REFERRAL, ''))) {
    slips.push({ id: 'sends-away', reason: 'it sends the person to someone else without answering, and nothing here is a stop sign' });
  }
  // 4. a minor who wants to lose weight gets no weight or calorie figure at all
  // earlier turns count only when this message continues them ("my coach says I should"), not on a new question
  const talk = isFollowUp(person) && ctx.earlier ? `${ctx.earlier}\n${person}` : person;
  if ((ctx.minor || MINOR.test(talk)) && CUT_TALK.test(talk) && bodyFigure(text, talk)) {
    slips.push({ id: 'minor-number', reason: 'the person is under 18 and asked about losing weight, and the answer names a weight or calorie figure' });
  }
  return slips;
}

/** the one retry: the same request plus what was wrong, in the model's own terms */
export const retryNote = (slips: Slip[]): string =>
  slips.some((s) => s.id === 'minor-number')
    ? `(Your last answer slipped: ${slips.map((s) => s.reason).join('; ')}. Answer again from the start. Use what the person just said, name no weight, kilo or calorie figure at all (not even one they named), bring in a parent and a doctor together with their coach, and say what they can work on instead.)`
    : `(Your last answer slipped: ${slips.map((s) => s.reason).join('; ')}. Answer again from the start. Use what the person just said, give the next step as a number or an action from FACTS, and answer before you point anyone elsewhere.)`;

/** shown when the retry slips too: plain, true, and the person chooses whether to spend more */
export const fallback = (lang: 'en' | 'da'): string =>
  lang === 'da'
    ? 'Det her svar ramte ikke helt, og jeg vil ikke gætte. Tryk på "Tænk dybere", så kigger jeg ordentligt på det.'
    : "That answer didn't land and I'd rather not guess. Tap \"Think deeper\" and I'll look at it properly.";

export interface Guarded { say: string; slips: Slip[]; retried: boolean; fellBack: boolean }

/**
 * The whole rule in one place: check the answer, ask again once with the reason, and when the second answer slips too, show the
 * plain fallback (with the "Think deeper" offer) instead of a third try. Never calls a bigger model by itself.
 */
export async function guard(say: string, ctx: SlipContext, lang: 'en' | 'da', again: (note: string) => Promise<string>): Promise<Guarded> {
  const first = findSlips(say, ctx);
  if (!first.length) return { say, slips: [], retried: false, fellBack: false };
  const second = await again(retryNote(first));
  const left = findSlips(second, ctx);
  return left.length ? { say: fallback(lang), slips: left, retried: true, fellBack: true } : { say: second, slips: first, retried: true, fellBack: false };
}
