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

/** words a person uses to ask for a change (English and Danish) */
const ASK_WORDS = 'set|change|update|raise|lower|log|add|track|record|save|remember|note|forget|delete|remove|drop|move|put|make it|sæt|ændr|opdater|hæv|sænk|tilføj|registrer|gem|husk|glem|slet|fjern|flyt|skriv';
const ASKS = new RegExp(`\\b(?:${ASK_WORDS})\\b`, 'i');
/** "don't change it", "do not log this", "ikke ændre", "lad være med at …": an ask turned down is not consent (Codex, PR #73) */
const NOT_ASKED = new RegExp(`\\b(?:don[’']?t|do not|never|not|no need to|without|ikke|aldrig|lad være med at|undlad at)\\s+(?:\\w+\\s+){0,2}?(?:${ASK_WORDS})\\b`, 'gi');
/** Does the person's own text ask for a change? Turned-down asks are taken out first. */
export const asksForChange = (text: string) => ASKS.test(text.replace(NOT_ASKED, ' '));

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
  if (!asksForChange(t.userText)) return { ok: false, reason: 'the person did not ask for a change; the request came from untrusted text' };
  const own = [...numbersIn(t.userText), ...t.sheet];
  const foreign = proposalNumbers(p).filter((n) => !own.some((x) => Math.abs(x - n) < 1e-9));
  if (foreign.length) return { ok: false, reason: `${foreign.join(', ')} comes only from untrusted text` };
  return { ok: true };
}
