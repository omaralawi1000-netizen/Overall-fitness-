/**
 * Which model answers (brief v2, Omar 3 Nov: maybe "a mix"). Code decides, never the AI: quick, low-risk turns go to the
 * fast model; real coaching and anything safety-related goes to the strong one. When unsure, the strong one.
 * This is one of the setups the exam measures (Flash only, Sonnet only, this mix); it ships only if it wins on score and cost.
 *
 * Third tier "big" (Omar, 8 Nov: "Fable only on the biggest tasks in the app, because it costs a ton"): building or
 * rebuilding a training plan, the weekly review, weight-class or cut planning, and "why" questions that need weeks of
 * data. Everything else (logging, lookups, everyday chat, single safety questions) stays on Sonnet. A setup without a
 * big model answers big turns with its deep one, so today's Coach is unchanged until the exam shows Fable is worth it.
 */
import { asksFor } from './untrusted';
import type { FactSheet } from './facts';

export type Tier = 'quick' | 'deep' | 'big';

const ACTIONS = ['set_target', 'remember', 'forget', 'log_water', 'log_weight', 'move_session', 'log_food', 'fix_food'] as const;

const W = (list: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${list})(?![\\p{L}\\p{N}_])`, 'iu');

/** topics where a mistake matters: always the strong model */
const RISK = W(
  [
    'pain\\w*', 'hurt\\w*', 'injur\\w*', 'sore\\w*', 'ache\\w*', 'dizz\\w*', 'faint\\w*', 'chest', 'smert\\w*', 'ondt', 'skade\\w*', 'svimmel',
    'cut\\w*', 'weigh-?ins?', 'weight class', 'make weight', 'diet\\w*', 'fast\\w*', 'skip\\w*', 'starv\\w*', 'binge\\w*', 'purg\\w*', 'vægtklasse', 'indvejning', 'faste', 'sult\\w*', 'slank\\w*',
    'creatine', 'kreatin', 'supplement\\w*', 'tilskud', 'steroid\\w*', 'pre-?workout',
    'wrestl\\w*', 'bryd\\w*', 'compet\\w*', 'konkurr\\w*', 'teen\\w*', '1[0-7] (?:years? old|år)', 'age', 'alder',
    'sick', 'ill', 'syg', 'pregnan\\w*', 'gravid', 'medic\\w*', 'medicin',
  ].join('|'),
);
/** the person wants reasons or a plan: coaching, not a lookup */
const THINK = W(['why', 'should', 'how do i', 'plan\\w*', 'program\\w*', 'help me', 'stuck', 'plateau\\w*', 'quit', 'hvorfor', 'skal jeg', 'hvordan', 'hjælp', 'giv op', 'stoppe'].join('|'));
/** a plain data question ("how much protein is left") */
const LOOKUP = W(['how much', 'how many', 'what is my', "what's my", 'left', 'hvor meget', 'hvor mange', 'hvad er mit', 'tilbage'].join('|'));

/** the biggest tasks in the app (Omar, 8 Nov): only these may go to the most expensive model */
const BIG = [
  // build or rebuild a training plan or program
  W('(?:make|build|write|create|design|redo|rebuild|rework|new|lav\\w*|byg\\w*|skriv\\w*|ny|nyt)(?:\\s+[\\p{L}\\p{N}-]+){0,3}\\s+(?:plan|program(?:me)?|split|routine|træningsplan|træningsprogram)'),
  W('plan (?:my|me|a|out my) (?:week|training|program\\w*|split|cut|bulk)|planlæg (?:min|mit|en|et) \\p{L}+|how should (?:my|the|this|next) week look|hvordan skal (?:ugen|min uge) se ud|plan for (?:ugen|næste uge)'),
  // getting ready for a competition or a season: a plan over weeks
  W('help me get ready|get(?:ting)? (?:me )?ready (?:to compete|for (?:a |the |my )?(?:tournament|competition|season|meet|match day))|gør(?:e)? mig klar til (?:en |at )?\\p{L}+'),
  // the weekly (or monthly) review
  W('weekly review|(?:review|go over|look at) (?:my|the|this|last) (?:week|month)|ugentlig\\w*|ugens gennemgang|gennemgå (?:min|mit|ugen|måneden)'),
  // weight class and cut planning
  W('weight class|make weight|make \\d+(?:[.,]\\d)? ?kg|cut (?:plan|to \\d+)|cut \\d+(?:[.,]\\d)? ?kg|tabe \\d+(?:[.,]\\d)? ?kg|\\d+ ?kg[ -]?(?:class|klasse)|(?:plan|start) (?:my|a) cut|vægtklasse|nå (?:ned på )?\\d+(?:[.,]\\d)? ?kg'),
];
/** "why" across weeks of data: a why (or hvorfor) next to a trend or a time span */
const WHY = W('why|hvorfor');
const SPAN = W('weeks?|months?|lately|anymore|stalled|plateau\\w*|stuck|not (?:gaining|losing|progressing|getting stronger)|uger?|måned\\w*|længe|står(?:\\s+\\p{L}+){0,2}\\s+stille|ikke (?:tager på|taber|bliver stærkere)|tager (?:jeg )?ikke på|taber (?:jeg )?ikke');

/** One of the biggest tasks in the app: a plan, the weekly review, a weight-class or cut plan, or a why across weeks. */
export function isBigTask(text: string, notice?: string): boolean {
  if (notice && /weekly review|ugentlig/i.test(notice)) return true;
  return BIG.some((r) => r.test(text)) || (WHY.test(text) && SPAN.test(text));
}

const MINOR = /\b1[0-7]\b.*(?:years? old|år)|^\s*1[0-7]\s*[,.;:]|\b(?:age|aged|alder)\s*:?\s*1[0-7]\b|\b1[0-7]\s*(?:y\/?o|-?years?-old|-årig)|\bunder 18\b|\bteen/i;

/**
 * Route one person turn. `history` is the earlier turns of this conversation: once it went deep, it stays deep, so a
 * follow-up ("ok, and Saturday?") keeps the context of the hard question.
 */
export function route(text: string, o: { sheet: FactSheet; history: Tier[]; untrusted: boolean; notice?: string }): Tier {
  // a big task keeps its model for the follow-ups ("make it 3 days instead"), so the plan is finished by the one that began it
  if (o.history.includes('big') || isBigTask(text, o.notice)) return 'big';
  if (o.history.includes('deep') || o.untrusted) return 'deep';
  // no message: the Coach speaking first is a judgment call (worth saying or silence), so the strong model
  if (!text.trim()) return 'deep';
  // under 18 (or a memory that says so): every answer needs the strict rules
  // ("16 years old", "17, plays handball", "age 16", "16yo": Codex, PR #81)
  if (o.sheet.memory.some((m) => MINOR.test(m.text))) return 'deep';
  if (RISK.test(text) || THINK.test(text)) return 'deep';
  const words = text.trim().split(/\s+/).length;
  if (ACTIONS.some((n) => asksFor(n, text)) && words <= 20) return 'quick';
  if (LOOKUP.test(text) && words <= 15) return 'quick';
  // greetings, thanks and short acknowledgements
  if (words <= 6 && !/\?/.test(text)) return 'quick';
  return 'deep';
}
