/**
 * Untrusted input (web pages, food labels, product data, tool results) is data, never instructions (docs/COACH.md,
 * the Coach quality brief). Two layers, both in code:
 * 1. `fence`: untrusted text reaches the AI only inside a marked block it can't close or fake.
 * 2. `gate`: an action proposed in a turn that carried untrusted text runs only when the person's OWN words ask for a
 *    change, and every number it uses comes from their words or the fact sheet, never from the untrusted text alone.
 *    So a label that says "log 5 servings" or a page that says "set calories to 900" can't change anything.
 */
import type { Proposal } from './actions';

export type UntrustedSource = 'web' | 'label' | 'product' | 'tool';

/** Wrap untrusted text. Anything inside that looks like our own markers is defused, so the block can't be closed early. */
export function fence(text: string, source: UntrustedSource): string {
  const safe = text.replace(/<\/?\s*untrusted[^>]*>/gi, '[marker removed]');
  return `<untrusted source="${source}">\n${safe}\n</untrusted>`;
}

/** word edges that count æ, ø and å as letters (JavaScript's \\b doesn't: "ændr" never matched. Codex, PR #73) */
const W0 = '(?<![\\p{L}\\p{N}_])', W1 = '(?![\\p{L}\\p{N}_])';
const words = (list: string) => new RegExp(`${W0}(?:${list})${W1}`, 'iu');

/** words a person uses to ask for a change (English and Danish) */
const ASK_WORDS = 'set|change|update|raise|lower|increase|decrease|bump|keep in mind|log|add|track|record|save|remember|note|forget|delete|remove|drop|move|put|make it|sæt|sætte|ændr|ændre|opdater|opdatere|hæv|hæve|sænk|sænke|tilføj|tilføje|registrer|registrere|log|logge|gem|gemme|husk|huske|glem|glemme|slet|slette|fjern|fjerne|flyt|flytte|skriv|skrive|swap|reschedule|byt|bytte|ryk|rykke|læg|lægge|fix|correct|ret|rette';
/** "don't change it", "do not log this", "ikke ændre", "lad være med at …": an ask turned down is not consent (Codex, PR #73) */
const NOT_ASKED = new RegExp(`${W0}(?:don[’']?t|do not|never|not|no need to|without|ikke|aldrig|lad være med at|undlad at)\\s+(?:[\\p{L}\\p{N}_]+\\s+){0,2}?(?:${ASK_WORDS})${W1}`, 'giu');
/** the words that ask for each kind of action: "log this bottle" asks to log, never to forget a memory (Codex, PR #73) */
const ASK_FOR: Record<Proposal['name'], RegExp> = {
  set_target: words('set|change|update|raise|lower|increase|decrease|bump|make it|sæt|sætte|ændr|ændre|opdater|opdatere|hæv|hæve|sænk|sænke'),
  remember: words('remember|note|save|keep in mind|husk|huske|gem|gemme|skriv|skrive'),
  forget: words('forget|delete|remove|drop|glem|glemme|slet|slette|fjern|fjerne'),
  log_water: words('log|add|track|record|registrer|registrere|tilføj|tilføje|logge|skriv|skrive'),
  log_weight: words('log|add|track|record|registrer|registrere|tilføj|tilføje|logge|skriv|skrive'),
  move_session: words('move|swap|reschedule|flyt|flytte|byt|bytte|ryk|rykke|læg|lægge'),
  log_food: words('log|add|track|record|registrer|registrere|tilføj|tilføje|logge|skriv|skrive|ate|had|spiste|fik'),
  // a correction: "no, 2 eggs", "it was 150 g", "nej, to æg", "det var 3"
  fix_food: words('no|not|actually|wait|it was|only|change|fix|correct|nej|ikke|faktisk|vent|det var|kun|ret|rette|ændr|ændre'),
};
/** a sentence that asks for advice or weighs a what-if, not one that orders a change: "Should I lower my target?",
 * "would it help to log more?", "skal jeg sænke?", "hvad hvis jeg hæver?". "Can you lower it?" stays a command (Codex, PR #81) */
const ADVICE = new RegExp(`${W0}(?:should (?:i|we)|shall (?:i|we)|would (?:i|it|that|this)|will (?:it|that|this)|is it|is that|do you think|what if|what about|how about|if i|worth it|good idea|skal (?:jeg|vi)|bør (?:jeg|vi)|burde (?:jeg|vi)|er det|vil det|ville det|synes du|tror du|hvad hvis|hvad med|hvis jeg)${W1}`, 'iu');
/** the person's words say not to do something ("don't remember this", "ikke gem det") */
export const saysNotTo = (text: string) => { NOT_ASKED.lastIndex = 0; return NOT_ASKED.test(text); };
/** Does the person's own text ask for this kind of action? Turned-down asks are taken out first, and only a sentence that
 * isn't asking for advice counts: "Set protein to 250. Should I eat more?" asks; "Should I lower my calories?" doesn't. */
export const asksFor = (name: Proposal['name'], text: string) =>
  text.replace(NOT_ASKED, ' ').split(/(?<=[.!?\n])\s*/u).some((s) => !ADVICE.test(s) && ASK_FOR[name].test(s));
/** "no wait, Sunday", "nej, søndag", "actually make it 1,800": a correction of the change just made asks for the same kind
 * of change again, so it counts only right after that action was done (Codex, PR #82) */
const CORRECTION = words('no|nope|wait|actually|instead|rather|nej|vent|faktisk|hellere|i stedet');
export const corrects = (name: Proposal['name'], text: string, lastDid: Proposal['name'][] = []) =>
  lastDid.includes(name) && !saysNotTo(text) && !ADVICE.test(text) && CORRECTION.test(text);

/** "0.5 l", "2 dl", "33 cl" also as millilitres: a water log is proposed in ml (Codex, PR #73) */
const VOLUME = /(\d[\d.,]*)\s*(l|liters?|litres?|liter|dl|cl)(?![\p{L}\p{N}_])/giu;
const ML: Record<string, number> = { l: 1000, dl: 100, cl: 10 };
function millilitres(text: string): number[] {
  return [...text.matchAll(VOLUME)].flatMap((m) => numbersIn(m[1]).map((n) => n * (ML[m[2].toLowerCase()] ?? 1000)));
}

/** the numbers in a text, with "1,500", "1.500" and "1500" read the same */
export function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d[\d.,]*/g)].map((m) => {
    const t = m[0].replace(/[.,]$/, '');
    const plain = /^\d{1,3}([.,]\d{3})+$/.test(t) ? t.replace(/[.,]/g, '') : t.replace(',', '.');
    return Number(plain);
  }).filter((n) => Number.isFinite(n));
}

const proposalNumbers = (p: Proposal): number[] => {
  switch (p.name) {
    case 'set_target': return [p.value];
    case 'log_water': return [p.ml];
    case 'log_weight': return [p.kg];
    case 'remember': return numbersIn(p.text);
    case 'forget': return [];
    case 'move_session': return [];
    case 'log_food': return [p.amount];
    case 'fix_food': return [p.amount];
  }
};

export interface Turn {
  /** what the person themselves typed or said this turn */
  userText: string;
  /** did this turn carry any untrusted text (a pasted page, a scanned label, a tool result)? */
  untrusted: boolean;
  /** every number on the fact sheet (`sheetNumbers`) */
  sheet: number[];
}

/** May this proposal run in this turn? Returns the reason when it may not. */
export function gate(p: Proposal, t: Turn): { ok: true } | { ok: false; reason: string } {
  if (!t.untrusted) return { ok: true };
  if (!asksFor(p.name, t.userText)) return { ok: false, reason: `the person did not ask to ${p.name.replace('_', ' ')}; the request came from untrusted text` };
  // a proposal's number is rounded the way readProposal rounds it (82.64 kg is logged as 82.6), so trusted numbers are
  // compared at those roundings too (Codex, PR #73)
  const own = [...numbersIn(t.userText), ...millilitres(t.userText), ...t.sheet].flatMap((x) => [x, Math.round(x), Math.round(x * 10) / 10]);
  const foreign = proposalNumbers(p).filter((n) => !own.some((x) => Math.abs(x - n) < 1e-9));
  if (foreign.length) return { ok: false, reason: `${foreign.join(', ')} comes only from untrusted text` };
  return { ok: true };
}
