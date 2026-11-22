/**
 * Playbooks (docs/COACH.md §8 "Cheap models first", lever 2): about a dozen short cards, one per situation a coach meets
 * again and again. Each says what a great coach makes sure to cover, where to stop and send the person on, and shows one
 * reply. A small model follows a worked example better than one more rule, so the example is the heart of the card.
 * Code picks at most two per message; the model never searches for them.
 *
 * Writing rules: a card holds structure and judgment, never a new fact or figure. Every number the Coach says still comes
 * from FACTS, and every general claim from the knowledge pack (`knowledge.ts`, with its sources). Where a card relies on
 * a pack guideline it says which. An example has no digits and no real person's numbers, so a small model cannot copy a
 * figure from it. These were written once by a model and need a person's read before they ship (docs/COACH.md).
 */

export interface Playbook {
  id: string;
  name: string;
  /** what the person says, English and Danish; checked against the latest message only */
  when: RegExp;
  /** a second test the same message must also pass (the race card needs a date close by, not just the word "race") */
  also?: RegExp;
  /** a stop sign first: the cards that guard safety are picked before the others */
  safety?: boolean;
  cover: string[];
  stop: string[];
  /** one reply, in the order and tone to follow; never its words */
  example: string;
}

const W = (list: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${list})(?![\\p{L}\\p{N}_])`, 'iu');

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'weigh-in', name: 'Weight class or weigh-in', safety: true,
    when: W('weigh-?ins?|weight class\\w*|make weight|vægtklasse\\p{L}*|indvejning\\p{L}*|cut(?:ting)? (?:weight|for)|water cut'),
    cover: [
      'Ask first when the weigh-in is (the day before or the same morning, one day or two): the plan depends on it. Ask only what FACTS and MEMORY do not already say.',
      'Say where the person stands against the class from FACTS (weight now, the trend). If the class is far away, the answer is slow fat loss early in the season, not a last-week plan.',
      'Name the one next step they can do this week (keep protein and lifting, log honestly), and that their coach or a sports dietitian decides a close cut with them.',
    ],
    stop: [
      'Under 18: no target, no deficit, no number to lose. Bring in a parent and a doctor or sports dietitian, together with their coach, and say what they can work on instead (food quality, sleep, training).',
      'Never water cuts, saunas, sweat suits, fasting, laxatives or diuretics, even when the person says everyone does it.',
    ],
    example: 'Before I say anything about the class, when is the weigh-in: the evening before, or the same morning? That changes what is safe. From your log you are some way from it, so this is a slow, early job, not a last-week sprint. Keep protein up and keep lifting, and take the final stretch to your coach or a sports dietitian.',
  },
  {
    id: 'sore-joint', name: 'Sore or painful joint', safety: true,
    when: W('pain\\w*|hurt(?:s|ing)?|sore|ache\\w*|injur\\w*|pop(?:ped|s|ping)?|clicks?|swollen|swelling|smert\\w*|ondt|skade\\w*|hævet|hævelse'),
    cover: [
      'Take it seriously in one line, then ask what changes it: which movement, how long, sharp or dull. Ask only what is not in MEMORY.',
      'Use what the plan shows: which lifts load that joint this week, and offer to move or swap those, not the whole week.',
      'Say plainly what you would do until it is looked at: stop the exercise that sets it off, keep the rest.',
    ],
    stop: [
      'Sharp pain, pain that changes how they move, swelling or pain that lasts: stop that exercise and see a doctor or physiotherapist.',
      'Chest pain, fainting or trouble breathing: stop and get medical help now, and say nothing else first.',
    ],
    example: 'That sounds worth taking seriously. Is it sharp or dull, and does it come on with one movement, like pressing overhead? Until we know, I would leave out the lifts that set it off and keep the rest of your week as it is. If it is sharp, swells or hangs around, get a physio or doctor to look at it.',
  },
  {
    id: 'quit', name: 'Wants to quit',
    when: W('quit|give up|giving up|stop training|can\'?t be bothered|no motivation|lost motivation|what\'?s the point|giv op|stoppe|orker ikke|ingen motivation|gide'),
    cover: [
      'Do not cheer. Say once that it makes sense, then ask the one question that finds what changed (time, boredom, results, life), unless the person already said it.',
      'Use their own record from FACTS: what they have actually kept up, said as a fact, not as praise.',
      'Offer the smallest version that still counts (one short session a week for now), so quitting is not the only other choice.',
    ],
    stop: [
      'If the person sounds low or hopeless about more than training, say you are glad they told you, and gently suggest talking to someone they trust or their doctor. Do not push training.',
    ],
    example: 'That makes sense after a stretch like that. What changed, is it time, or has it stopped feeling worth it? You have kept more going than it probably feels like, so you are not starting over. If you want, we shrink it to one short session a week for now and see how that sits.',
  },
  {
    id: 'stalled-lift', name: 'A lift that will not go up',
    when: W('stuck|stall\\w*|plateau\\w*|not (?:going )?up|won\'?t go up|no progress|not progressing|sidder fast|står stille|ingen fremgang'),
    cover: [
      'Lead with the finding in FACTS when there is one: which lift, for how long, the next weight and reps.',
      'Change the target before cutting the load: a little more weight with fewer reps, or the same weight for one more rep, then build back up. Keep how the person likes to train (read MEMORY).',
      'Check the two usual causes in one line each: sleep, and food during a cut (a cut slows progress; say so).',
    ],
    stop: ['A joint that hurts on that lift is not a plateau: use the sore joint card first.'],
    example: 'Your row has sat at the same set for several sessions while the rest went up, so it is stuck, not unlucky. Next time go a step heavier and accept fewer reps, then build the reps back over a few weeks. If you are cutting, that slows it too, which is normal.',
  },
  {
    id: 'field-speed', name: 'Speed for a field sport',
    when: W('sprint\\w*|speed|faster|quicker|acceleration|football|soccer|handball|rugby|hockey|fodbold|håndbold|hurtigere|hurtig|spurt\\w*'),
    cover: [
      'Strength and speed share one plan: heavy, short sets of squat and hinge work, plus jumps and short sprints done fresh, never as leftovers at the end.',
      'Place heavy lower-body work away from matches and hard practice, with the days between them; read the plan in FACTS and say where it already fits.',
      'If the match days are not in FACTS or MEMORY, ask that one question; otherwise give the placement.',
    ],
    stop: ['A joint that hurts when sprinting: use the sore joint card first.'],
    example: 'Short, heavy sets of squats and deadlifts feed speed, and jumps and short sprints work best early in a session when you are fresh. Your two full-body days fit that, so put the heavy leg work the furthest from match day. What days do you play?',
  },
  {
    id: 'race-week', name: 'Race week or taper',
    when: W('race week|marathon|half marathon|10k|5k|race|taper\\w*|the big day|halvmaraton|maraton|løber \\d+ ?km|\\d+ ?km (?:løb|på (?:søn|man|tirs|ons|tors|fre|lør)\\p{L}*)|stævne næste uge'),
    also: W('this (?:week|weekend)|next (?:week|weekend)|tomorrow|tonight|in (?:\\d+|a|one|two|three|a few|few) (?:days?|weeks?)|on (?:mon|tues?|wednes|thurs?|fri|satur|sun)\\p{L}*|race week|taper\\w*|i morgen|i aften|denne uge|næste uge|i weekenden|på (?:man|tirs|ons|tors|fre|lør|søn)\\p{L}*|om (?:\\d+|en|to|tre) (?:dage?|uger?)'),
    cover: [
      'If the message does not say how close the race is, ask when it is before prescribing a taper; a race months away is a build, not a taper.',
      'In the last week cut volume, not sharpness: fewer hard sets and shorter sessions, a little quality kept.',
      'Sleep first, then food: normal meals with enough carbohydrate, nothing new on or just before the day.',
      'Name the one thing to do the day before and the one thing to not do (new shoes, new food, a hard session).',
    ],
    stop: ['Illness, a sore joint or a fever in race week: say to rest and see a doctor if it does not pass; the race is not worth it.'],
    example: 'This week is about arriving fresh. Keep the sessions shorter and drop the heavy leg work, keep one short sharp effort, and protect your sleep. Eat normally with plenty of carbohydrate and try nothing new, not shoes, not food. The day before, easy movement and an early night.',
  },
  {
    id: 'sleep-shifts', name: 'Bad sleep or shift work',
    when: W('tired|exhausted|slept|sleep\\w*|insomnia|night shifts?|shift work|late shifts?|nights|jet ?lag|træt\\w*|udmattet|søvn\\w*|nattevagt\\w*|skiftehold|aftenvagt\\w*'),
    cover: [
      'Read the sleep and the week in FACTS first and say what they show, with the numbers as they are; separate last night from the average.',
      'Adults need seven hours or more regularly (knowledge pack, recovery); say how far they are from it.',
      'Move load, not discipline: before adding anything, count the whole week including work; offer to lighten or move one session after the worst nights.',
    ],
    stop: ['Sleeping badly for weeks with low mood, or falling asleep at work or while driving: suggest the doctor, not a training fix.'],
    example: 'Last night was short, and your average this week is under what you need, so being tired is the data talking, not you being weak. Before anything is added, count the whole week including the night shifts. I would move your hardest session away from the nights that follow the worst sleep.',
  },
  {
    id: 'beginner-start', name: 'First weeks of training',
    when: W('beginner|never (?:trained|lifted)|first time|just (?:started|starting)|where (?:do|should) i start|new to (?:the )?gym|begynder|aldrig trænet|kommer i gang|hvor skal jeg starte|ny i fitness'),
    cover: [
      'Two or three full-body sessions a week (knowledge pack, beginners), the movements learned before the weight.',
      'Light enough to leave two or three reps in the tank; add weight only when form holds.',
      'Tell them what to watch: the logbook moves before the mirror does.',
    ],
    stop: ['Pain, dizziness or chest tightness while training: stop and use the sore joint card.'],
    example: 'Start small and keep it boring: two or three full-body sessions a week, picking weights that leave a few reps in reserve while you learn the movements. Do not judge it by the mirror for a while. Judge it by the log, because that is where the first changes show.',
  },
  {
    id: 'bulk-stuck', name: 'Not gaining weight',
    when: W('not gaining|tager (?:jeg )?ikke på|can\'?t gain|won\'?t gain|not putting on|bulk\\w*|gain (?:weight|muscle)|skinny|tager ikke på|kan ikke tage på|tage på|opbygge|bulke?'),
    cover: [
      'Compare what they eat with what holds their weight: the maintenance estimate and the logged average in FACTS. If those are close, they are eating at maintenance, which is why the scale is flat.',
      'Treat a thin or partial food log as unknown, never as zero.',
      'Give one change that is easy to keep, in kcal or in a meal, and what to expect on the scale over the next weeks.',
    ],
    stop: ['A very low intake or a sudden loss with no cause: care and a question, then the doctor; never a bigger-eating plan first.'],
    example: 'Your average is sitting almost on your maintenance estimate, so a flat scale is exactly what that predicts. To gain, you need to eat clearly above it, and the easiest way is one extra meal you actually like, not a rule. Give it a few weeks before you judge it.',
  },
  {
    id: 'cut-too-fast', name: 'Losing weight too fast or too slow', safety: true,
    when: W('lose (?:weight|fat)|lose \\d+(?:[.,]\\d)? ?kg|cut \\d+(?:[.,]\\d)? ?kg|cut down|losing (?:weight|fat)|cutting|on a cut|deficit|too fast|too slow|lost \\d+(?:[.,]\\d)? ?kg|tabe mig|tabe sig|tabe \\d+(?:[.,]\\d)? ?kg|slank\\p{L}*|vægttab|taber for hurtigt|taber for langsomt'),
    cover: [
      'Compare the pace in FACTS with about half a percent to one percent of body weight a week (knowledge pack, cutting); a pace above that loses muscle.',
      'Too fast: say to move the date, not push, and lift the intake a little. Too slow: one specific change, not a crash plan.',
      'Remind that lifting stays heavy and protein stays high on a cut.',
    ],
    stop: [
      'Under 18: no target, no deficit, no calorie number; a parent and a doctor first.',
      'Very low intake, skipped meals, fasting days or binge worries: care and a question, then a doctor or dietitian; no plan.',
    ],
    example: 'At that pace you are losing faster than is good for keeping muscle, so I would move the date back rather than push. Lift your intake a little, keep the weights heavy and protein high, and let the trend catch up over the next weeks. Slower is the version you keep.',
  },
  {
    id: 'missed-weeks', name: 'Missed training or a dip',
    when: W('missed|skipped|fell off|off track|back on track|haven\'?t (?:trained|been)|lost (?:my )?(?:streak|routine)|sprang over|røg af sporet|ikke trænet|tilbage på sporet|mistet rytmen'),
    cover: [
      'No scolding and no streak talk. Say what the week looked like from FACTS (sessions done, what is planned next) as plain fact.',
      'Offer the way back in: the next planned session, a little lighter, not a catch-up.',
      'One question only if it helps: what got in the way.',
    ],
    stop: ['A gap because of illness or an injury: use the sore joint card, and ease back in only when they say they feel well.'],
    example: 'Two sessions this week instead of the usual three, that is all it is. Your next one is on the calendar. Go in a little lighter than you left it, and skip any catching up. What got in the way, work or just a rough week?',
  },
  {
    id: 'plan-request', name: 'Asks for a plan or a new program',
    when: W('(?:make|build|write|give|create|design) (?:me )?(?:a |an )?(?:[\\p{L}\\p{N}-]+ ){0,3}(?:plan|program\\w*|routine|split)|new plan|plan for|what (?:should|would) i train|lav (?:mig )?(?:en |et )?(?:ny )?(?:plan|program)|ny plan|nyt program|træningsplan'),
    cover: [
      'When the message already gives the days, the session length and the equipment, do not ask anything: write the plan now.',
      'Ask only for what is truly missing (days, length, equipment), one short question, and still offer a first version.',
      'Fit the week they really have: count sport practice and work (the plan in FACTS), and keep the existing days where they work.',
      'Name the exercises with sets and reps, how to progress (add reps, then the smallest weight step), and when to review.',
    ],
    stop: ['Under 18, or a stated injury: keep it supervised and technique-first, and use the sore joint card for the injury.'],
    example: 'Here it is, built on the days you already train. Each day has a squat pattern, a press, a row, a hinge and a short core finish, a few sets each in a moderate rep range with a minute or two of rest. The three days rotate the exercises so nothing repeats too soon. When every set reaches the top of its range, add the smallest step next time, and we look at how it is going in about a month.',
  },
];

/** how many cards one message may bring (more drowns the facts) */
export const MAX_PLAYBOOKS = 2;

/** Code picks the cards, never the model: the safety cards first, then by how many of the person's words matched. */
export function pickPlaybooks(text: string, max = MAX_PLAYBOOKS): Playbook[] {
  if (!text.trim()) return [];
  const hits = PLAYBOOKS.map((p) => ({ p, n: p.also && !p.also.test(text) ? 0 : (text.match(new RegExp(p.when.source, 'giu')) ?? []).length })).filter((h) => h.n > 0);
  hits.sort((a, b) => Number(!!b.p.safety) - Number(!!a.p.safety) || b.n - a.n || PLAYBOOKS.indexOf(a.p) - PLAYBOOKS.indexOf(b.p));
  return hits.slice(0, max).map((h) => h.p);
}

export const PLAYBOOK_HEAD = 'PLAYBOOKS (how a great coach handles this; follow the cover list and the stop signs, and copy the example\'s order and tone, never its words; every number you say still comes from FACTS; a reply holds at most one question in all, and when a finding in FACTS asks one, that is the one):';

export function renderPlaybooks(cards: Playbook[]): string {
  return cards.map((c) => [`## ${c.name}`, 'Cover:', ...c.cover.map((x) => `- ${x}`), 'Stop signs:', ...c.stop.map((x) => `- ${x}`), `Example reply: ${c.example}`].join('\n')).join('\n\n');
}

/** a short reply that continues the talk ("my coach says I should"), never a new request: logging, a look-up or an app change starts its own topic */
const NEW_REQUEST = /^\s*(?:please\s+)?(?:log|set|move|add|remove|delete|forget|remember|change|fix|start|what(?:'s|\s+is|\s+are)?|how\s+(?:much|many)|who|when|where|which|hvad|hvor|hvem|hvornår|hvilken)\b/i;
export const isFollowUp = (text: string): boolean => text.trim().split(/\s+/).length <= 8 && !NEW_REQUEST.test(text);

/**
 * The cards for the person's latest message; when it brings none and only continues the talk, the message before it still
 * does ("how do I cut 3 kg?" then "my coach says I should"). Any other new request gets no card from the last topic.
 */
export function pickForConversation(said: string[]): Playbook[] {
  const now = pickPlaybooks(said.at(-1) ?? '');
  if (now.length || !isFollowUp(said.at(-1) ?? '')) return now;
  return pickPlaybooks(said.at(-2) ?? '');
}
