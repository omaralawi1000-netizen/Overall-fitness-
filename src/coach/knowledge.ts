/**
 * The Coach's expert knowledge pack (brief v2, Answer Bar rule 12): short sports-science guidelines, each with its
 * sources and the date it was last checked against them. The Coach cites these for general advice and keeps them apart
 * from the person's own facts (rule 5). Opponent models in the exam get the same pack, so a win is never "we knew more".
 *
 * Writing rules: only what the cited source says, or a line marked "Aven rule" (our own safety or product choice, not
 * a research claim). Numbers are general guidance for healthy people; the fact sheet says what applies to this person.
 * Re-check each guideline against its sources at least once a year and update `checked`.
 */

export interface Source { title: string; year: number; url: string }
export interface Guideline {
  id: 'protein' | 'cutting' | 'recovery' | 'strength' | 'beginners' | 'wrestling-weight' | 'under-18' | 'creatine';
  topic: string;
  /** the guidance itself, short enough to quote on a phone */
  points: string[];
  sources: Source[];
  /** the day these points were last checked against the sources (YYYY-MM-DD) */
  checked: string;
}

const ACSM_2026: Source = {
  title: 'ACSM position stand: Resistance training prescription for muscle function, hypertrophy and physical performance in healthy adults (Med Sci Sports Exerc)',
  year: 2026,
  url: 'https://acsm.org/resistance-training-guidelines-update-2026/',
};
const HELMS_2014: Source = {
  title: 'Helms, Aragon & Fitschen: Evidence-based recommendations for natural bodybuilding contest preparation (J Int Soc Sports Nutr 11:20)',
  year: 2014,
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4033492/',
};
const AAP_WRESTLING: Source = {
  title: 'American Academy of Pediatrics: Cutting weight, a major problem in wrestling (HealthyChildren.org, from Pediatric Nutrition 7th ed.)',
  year: 2014,
  url: 'https://www.healthychildren.org/English/healthy-living/sports/Pages/Cutting-Weight-A-Major-Problem-in-Wrestling.aspx',
};

export const KNOWLEDGE: Guideline[] = [
  {
    id: 'protein',
    topic: 'Protein',
    points: [
      'Most people who train do well on 1.4–2.0 g of protein per kg of body weight a day.',
      'On average, extra muscle gain levels off around 1.6 g/kg a day (the uncertainty runs up to about 2.2 g/kg), so 1.6–2.2 g/kg covers almost everyone.',
      'Lean, trained lifters on a diet may keep more muscle at 2.3–3.1 g per kg of lean (fat-free) mass.',
      'Spread it over the day: about 0.25 g/kg (20–40 g) per meal, every 3–4 hours. Food first; powders are a convenience.',
    ],
    sources: [
      { title: 'Jäger et al.: ISSN position stand, protein and exercise (J Int Soc Sports Nutr 14:20)', year: 2017, url: 'https://doi.org/10.1186/s12970-017-0177-8' },
      { title: 'Morton et al.: Protein supplementation and resistance training gains, meta-analysis (Br J Sports Med 52:376)', year: 2018, url: 'https://bjsm.bmj.com/content/52/6/376' },
      HELMS_2014,
    ],
    checked: '2026-11-03',
  },
  {
    id: 'cutting',
    topic: 'Losing fat (a cut)',
    points: [
      'Aim to lose about 0.5–1% of body weight a week; slower keeps more muscle, faster loses more of it.',
      'Keep lifting with heavy loads and keep protein high (see Protein).',
      'Fat around 15–30% of calories.',
      'Aven rule: never crash diets, fasting days or skipped meals as a method. Very low intake gets care and a question, not a plan.',
      'Aven rule: no cutting or weight-loss targets for anyone under 18 (see Under 18).',
    ],
    sources: [HELMS_2014],
    checked: '2026-11-03',
  },
  {
    id: 'recovery',
    topic: 'Recovery and training load',
    points: [
      'Adults (18–60) need 7 or more hours of sleep a night, regularly.',
      'Teenagers (13–18) need 8–10 hours per 24 hours.',
      'Aven rule: before adding sessions or sets, count the whole week, sport practice included, and look at sleep and whether lifts are still moving. During a cut, recover first and add last.',
      'Aven rule: sharp pain, pain that changes how you move, swelling or pain that lasts: stop that exercise and see a doctor or physiotherapist. Chest pain, fainting or trouble breathing: stop and get medical help now.',
    ],
    sources: [
      { title: 'Watson et al.: Recommended amount of sleep for a healthy adult, AASM/SRS consensus (J Clin Sleep Med 11:591)', year: 2015, url: 'https://aasm.org/aasm-and-srs-publish-new-sleep-duration-consensus-statement/' },
      { title: 'Paruthi et al.: Recommended amount of sleep for pediatric populations, AASM consensus (J Clin Sleep Med 12:785)', year: 2016, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4877308' },
    ],
    checked: '2026-11-03',
  },
  {
    id: 'strength',
    topic: 'Getting stronger and building muscle',
    points: [
      'Train every major muscle group at least twice a week.',
      'Strength: heavy loads (around 80% of your one-rep max) for 2–3 sets per exercise.',
      'Muscle size: roughly 10 hard sets per muscle group a week.',
      'Training to failure, machines versus free weights and complex periodisation make little difference for most healthy adults; pick what you enjoy and will keep doing.',
      'Aven rule: progress with double progression. When every set reaches the top of the rep range, add the smallest step (usually 2.5 kg) next time.',
    ],
    sources: [ACSM_2026],
    checked: '2026-11-03',
  },
  {
    id: 'beginners',
    topic: 'Beginners',
    points: [
      'Start with 2–3 full-body sessions a week that cover every major muscle group.',
      'Bands, bodyweight and home training work too; the best program is one you will keep doing.',
      'Aven rule: learn the movements first. Pick weights that leave 2–3 reps in the tank, and add weight only when form holds.',
      'Aven rule: strength usually rises before the mirror changes; judge the first weeks by the logbook, not looks.',
    ],
    sources: [ACSM_2026],
    checked: '2026-11-03',
  },
  {
    id: 'wrestling-weight',
    topic: 'Wrestling and making weight',
    points: [
      'Rapid fluid loss ("cutting weight" by dehydration) is potentially life-threatening.',
      'In US school wrestling, weight loss may not exceed 1.5% of body weight a week, and the weight class must allow at least 7% body fat (boys) or 12% (girls).',
      'Ask first: when is the weigh-in (the day before or the same morning, one day or two)? The plan depends on it. Some events weigh in again on day two with no allowance.',
      'Aven rule: reach the class by slow fat loss well before the season. Never water cuts, saunas, sweat suits, spitting, diuretics, laxatives or fasting; for a close cut, the person talks to their coach or a sports dietitian.',
    ],
    sources: [
      AAP_WRESTLING,
      { title: 'Reale, Slater & Burke: Acute weight-loss strategies for combat sports (Int J Sports Physiol Perform 12:142)', year: 2017, url: 'https://pubmed.ncbi.nlm.nih.gov/27347784/' },
    ],
    checked: '2026-11-03',
  },
  {
    id: 'under-18',
    topic: 'Under 18',
    points: [
      'Strength training is safe and useful for children and teenagers when it is supervised and technique comes first.',
      'The American Academy of Pediatrics advises against performance-enhancing supplements, creatine included, for under-18s.',
      'Aven rule: for under-18s, no supplement doses and no cutting or weight-loss targets; for those, talk to a parent and a doctor. Food, sleep and steady training do the work.',
    ],
    sources: [
      { title: 'Stricker, Faigenbaum & McCambridge: Resistance training for children and adolescents, AAP clinical report (Pediatrics, doi 10.1542/peds.2020-1011)', year: 2020, url: 'https://www.aap.org/en/news-room/news-releases/aap/2020/american-academy-of-pediatrics-provides-guidance-on-resistance-training-for-children' },
      { title: 'LaBotz & Griesemer: Use of performance-enhancing substances, AAP clinical report (Pediatrics, doi 10.1542/peds.2016-1300)', year: 2016, url: 'https://doi.org/10.1542/peds.2016-1300' },
      AAP_WRESTLING,
    ],
    checked: '2026-11-03',
  },
  {
    id: 'creatine',
    topic: 'Creatine',
    points: [
      'Creatine monohydrate is one of the best-studied supplements and is safe and well tolerated in healthy adults.',
      'Dose: 3–5 g a day; it fills the muscles over 3–4 weeks. A loading week (about 0.3 g/kg a day for 5–7 days) only gets there faster.',
      'Not for under-18s in this app (see Under 18).',
    ],
    sources: [
      { title: 'Kreider et al.: ISSN position stand, safety and efficacy of creatine supplementation (J Int Soc Sports Nutr 14:18)', year: 2017, url: 'https://doi.org/10.1186/s12970-017-0173-z' },
    ],
    checked: '2026-11-03',
  },
];

/** the pack as the Coach (and every exam opponent) reads it: one short block per guideline, sources by name and year */
export function renderKnowledge(pack: Guideline[] = KNOWLEDGE): string {
  return pack
    .map((g) => [`## ${g.topic} [${g.id}]`, ...g.points.map((p) => `- ${p}`), `Sources: ${g.sources.map((s) => `${s.title}, ${s.year}`).join('; ')}`].join('\n'))
    .join('\n\n');
}
