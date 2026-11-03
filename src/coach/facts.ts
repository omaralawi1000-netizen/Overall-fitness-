/**
 * The Coach's one fact sheet (docs/COACH.md §2, Answer Bar rule 3). Code computes every number here; the AI only puts
 * these numbers into words. Chat, voice and notices all read this one sheet, so they never disagree.
 *
 * Rules that hold everywhere below:
 * - Missing is never zero: a fact that can't be known is left out, and `trust` says why.
 * - Logged food is not all food: a day counts as complete only when it is marked complete (DATA-MODEL.md, `dayNote`).
 *   Averages use complete days. A plain average of what was logged is labelled `partial`.
 * - A trend needs enough data (weight: 6 weigh-ins over at least 14 days). Below that it is left out, with a note.
 * - Odd entries are flagged and kept out of trends, never counted silently.
 */
import type { AnyRecord, Bodyweight, FoodLog, MemoryCard, Settings } from '../engine/model';
import { addDays, dayKeyAt, diffDays, wallClock, weekdayOf } from '../engine/time';
import { numbersIn } from './untrusted';

/** how far a fact can be trusted */
export type Confidence = 'measured' | 'partial' | 'estimate';
export interface Fact { id: string; value: number; unit: string; confidence: Confidence; note?: string }

export interface GoalFact {
  memoryId: string;
  text: string;
  metric: 'weight' | 'lift' | 'other';
  target?: number;
  by?: string;
  /** reached / onPace / behind / ahead / cantJudge / missed: worked out from the weight trend, never guessed */
  status: 'reached' | 'onPace' | 'behind' | 'ahead' | 'cantJudge' | 'missed' | 'done' | 'dropped';
  /** kg a week needed from now to reach the target by its date */
  neededKgPerWeek?: number;
}

export interface FactSheet {
  now: { at: number; day: string; weekday: number; hour: number; partOfDay: 'night' | 'morning' | 'midday' | 'afternoon' | 'evening' };
  person: { name?: string; language: 'en' | 'da'; targets: Fact[] };
  /** standing and current memory, in the person's words */
  memory: { id: string; text: string; topic: MemoryCard['topic']; until?: string }[];
  /** memory that has run out (an old injury, a past exam week): never to be treated as current */
  ended: { id: string; text: string; endedOn: string }[];
  goals: GoalFact[];
  today: { food: Fact[]; foodComplete: boolean; left: Fact[]; water?: Fact; weighIn?: Fact; sessions: { name: string; state: string }[] };
  /** the last 28 days, today not included */
  food28: { daysLogged: number; daysComplete: number; facts: Fact[] };
  weight: { latest?: Fact; latestDay?: string; trend?: Fact; odd: { id: string; kg: number; day: string }[] };
  training: { sessions7: number; sessions28: number; activities7: Record<string, number> };
  /** what the data can't say, in plain words */
  trust: string[];
}

const KCAL_FLOOR_NOTE = 'needs 6 weigh-ins over at least 14 days';
const r1 = (n: number) => Math.round(n * 10) / 10;
const live = <T extends AnyRecord>(rs: AnyRecord[], kind: T['kind']) => rs.filter((r): r is T => r.kind === kind && !r.deleted);

function partOfDay(h: number): FactSheet['now']['partOfDay'] {
  if (h < 5) return 'night';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 18) return 'afternoon';
  return h < 23 ? 'evening' : 'night';
}

/** the day a record belongs to: its own `day`, else worked out from its moment */
function dayOf(r: AnyRecord, dayStart: number): string { return r.day ?? dayKeyAt(r.at, r.tz, dayStart); }

/** the trusted weigh-in closest to a day, within 14 days of it */
function nearest(byDay: Map<string, Bodyweight>, day: string): Bodyweight | undefined {
  let best: [number, Bodyweight] | undefined;
  for (const [d, w] of byDay) { const gap = Math.abs(diffDays(d, day)); if (gap <= 14 && (!best || gap < best[0])) best = [gap, w]; }
  return best?.[1];
}

/**
 * Pick the weigh-in to trust for each day. Several on one day that differ by more than 1.5 kg are odd: the one closest
 * to the person's recent weight (median of the 7 days before) is kept; with no history to compare, none of them is.
 * A single weigh-in far from that recent weight (more than 3 kg or 4 %, whichever is more) is odd too: a typo like 180 for
 * 80 must never become the latest weight or bend the trend (Codex, PR #73).
 */
/** further from recent weight than a body changes between weigh-ins: more than 3 kg or 4 %, whichever is more */
const far = (kg: number, median: number) => Math.abs(kg - median) > Math.max(3, median * 0.04);

function trustedWeights(ws: Bodyweight[], dayStart: number): { byDay: Map<string, Bodyweight>; odd: Bodyweight[] } {
  const days = new Map<string, Bodyweight[]>();
  for (const w of [...ws].sort((a, b) => a.at - b.at)) {
    const d = dayOf(w, dayStart);
    days.set(d, [...(days.get(d) ?? []), w]);
  }
  const byDay = new Map<string, Bodyweight>();
  const odd: Bodyweight[] = [];
  for (const d of [...days.keys()].sort()) {
    const list = days.get(d)!;
    const spread = Math.max(...list.map((w) => w.kg)) - Math.min(...list.map((w) => w.kg));
    const before = [...byDay.entries()].filter(([k]) => diffDays(d, k) > 0 && diffDays(d, k) <= 7).map(([, w]) => w.kg).sort((a, b) => a - b);
    const median = before.length ? before[Math.floor(before.length / 2)] : undefined;
    if (spread <= 1.5) {
      if (median !== undefined && before.length >= 2 && far(list[0].kg, median)) { odd.push(...list); continue; }
      byDay.set(d, list[0]);
      continue;
    }
    if (median === undefined) { odd.push(...list); continue; }
    const keep = [...list].sort((a, b) => Math.abs(a.kg - median) - Math.abs(b.kg - median))[0];
    // the closest one must itself be plausible: 180 and 182 after weeks at 80 are both typos (Codex, PR #73)
    if (far(keep.kg, median)) { odd.push(...list); continue; }
    byDay.set(d, keep);
    odd.push(...list.filter((w) => Math.abs(w.kg - keep.kg) > 1.5));
  }
  return { byDay, odd };
}

/** least-squares slope in kg a day */
function slope(points: { x: number; y: number }[]): number {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return den ? num / den : 0;
}

const NUTRIENTS = [['kcal', 'kcal'], ['protein', 'g'], ['carbs', 'g'], ['fat', 'g'], ['fibre', 'g']] as const;

export function buildFacts(records: AnyRecord[], o: { now: number; tz: string }): FactSheet {
  const settings = live<Settings>(records, 'settings')[0];
  const dayStart = settings?.dayStartHour ?? 0;
  const today = dayKeyAt(o.now, o.tz, dayStart);
  const hour = wallClock(o.now, o.tz).h;
  const trust: string[] = [];
  const targets = settings?.targets ?? {};

  // ── person ──
  const targetFacts: Fact[] = [];
  for (const [k, unit] of [...NUTRIENTS, ['waterMl', 'ml']] as const) {
    const v = targets[k as keyof typeof targets];
    if (typeof v === 'number') targetFacts.push({ id: `target.${k}`, value: v, unit, confidence: 'measured' });
  }

  // ── memory ──
  const memory: FactSheet['memory'] = [];
  const ended: FactSheet['ended'] = [];
  for (const m of live<MemoryCard>(records, 'memory').sort((a, b) => b.lastSeen - a.lastSeen)) {
    if (m.validUntil && m.validUntil < today) ended.push({ id: m.id, text: m.text, endedOn: m.validUntil });
    else if (m.validFrom <= today) memory.push({ id: m.id, text: m.text, topic: m.topic, ...(m.validUntil ? { until: m.validUntil } : {}) });
  }

  // ── food ──
  const foods = live<FoodLog>(records, 'food');
  const complete = new Set(live<AnyRecord>(records, 'dayNote').filter((n) => (n as { foodComplete?: boolean }).foodComplete && n.day).map((n) => n.day!));
  const perDay = new Map<string, Record<string, number>>();
  /** per day, the nutrients some food that day has no value for: that day's total of it is a floor, not the total (Codex, PR #73) */
  const gaps = new Map<string, Set<string>>();
  /** days with an estimated food: their totals are estimates, never measurements (Codex, PR #73) */
  const guessed = new Set<string>();
  for (const f of foods) {
    const d = dayOf(f, dayStart);
    if (f.estimated) guessed.add(d);
    const sum = perDay.get(d) ?? {};
    for (const [k] of NUTRIENTS) {
      const v = f.nutrients[k];
      if (typeof v === 'number') sum[k] = (sum[k] ?? 0) + v;
      else gaps.set(d, (gaps.get(d) ?? new Set()).add(k));
    }
    perDay.set(d, sum);
  }
  const whole = (d: string, k: string) => complete.has(d) && !gaps.get(d)?.has(k);
  /** a whole total is measured unless an estimated food went into it */
  const sureness = (ds: string[]): Confidence => (ds.some((d) => guessed.has(d)) ? 'estimate' : 'measured');
  const todaySum = perDay.get(today);
  const todayComplete = complete.has(today);
  const todayFood: Fact[] = [];
  const left: Fact[] = [];
  if (todaySum) {
    for (const [k, unit] of NUTRIENTS) {
      if (todaySum[k] === undefined) continue;
      const sure = whole(today, k);
      const confidence: Confidence = sure ? sureness([today]) : 'partial';
      const note = !todayComplete ? 'logged so far; the day is not finished' : !sure ? `some foods today have no ${k} value` : confidence === 'estimate' ? 'includes estimated foods' : undefined;
      todayFood.push({ id: `today.${k}`, value: Math.round(todaySum[k]), unit, confidence, ...(note ? { note } : {}) });
      const t = targets[k as keyof typeof targets];
      if (typeof t === 'number') left.push({ id: `today.${k}Left`, value: Math.round(t - todaySum[k]), unit, confidence, note: 'target minus what is logged so far' });
    }
  }

  const window = Array.from({ length: 28 }, (_, i) => addDays(today, -(i + 1)));
  const logged = window.filter((d) => perDay.has(d));
  const done = logged.filter((d) => complete.has(d));
  const food28: Fact[] = [];
  for (const [k, unit] of NUTRIENTS) {
    const fullDays = done.filter((d) => whole(d, k) && perDay.get(d)![k] !== undefined);
    const full = fullDays.map((d) => perDay.get(d)![k]);
    const est = fullDays.filter((d) => guessed.has(d)).length;
    if (full.length >= 3) food28.push({ id: `food28.${k}AvgComplete`, value: Math.round(full.reduce((s, v) => s + v, 0) / full.length), unit, confidence: sureness(fullDays), note: `average of ${full.length} complete days${est ? `, ${est} with estimated foods` : ''}` });
    const any = logged.map((d) => perDay.get(d)![k]).filter((v): v is number => v !== undefined);
    if (any.length && any.length > full.length) food28.push({ id: `food28.${k}AvgLogged`, value: Math.round(any.reduce((s, v) => s + v, 0) / any.length), unit, confidence: 'partial', note: `average of what was logged on ${any.length} days; logs may be missing food` });
    const t = targets[k as keyof typeof targets];
    if (k === 'protein' && typeof t === 'number' && any.length) {
      food28.push({ id: 'food28.proteinTargetDays', value: any.filter((v) => v >= t).length, unit: `of ${any.length} logged days`, confidence: 'measured', note: `days with at least ${t} g protein logged` });
    }
  }
  if (logged.length < 28) trust.push(`Food was logged on ${logged.length} of the last 28 days${done.length ? `, ${done.length} marked complete` : ', none marked complete'}.`);
  if (todaySum && !todayComplete) trust.push("Today's food is what's logged so far, not the whole day.");

  // ── water and weight ──
  const waterToday = live<AnyRecord>(records, 'water').filter((w) => dayOf(w, dayStart) === today);
  const water = waterToday.length ? { id: 'today.water', value: waterToday.reduce((s, w) => s + (w as { ml: number }).ml, 0), unit: 'ml', confidence: 'partial' as const, note: 'logged so far' } : undefined;

  const { byDay, odd } = trustedWeights(live<Bodyweight>(records, 'bodyweight'), dayStart);
  const weightDays = [...byDay.keys()].filter((d) => d <= today).sort();
  const lastDay = weightDays.at(-1);
  const latest = lastDay ? { id: 'weight.latest', value: byDay.get(lastDay)!.kg, unit: 'kg', confidence: 'measured' as const, note: `weighed ${lastDay}` } : undefined;
  const recent = weightDays.filter((d) => diffDays(today, d) < 28);
  let trend: Fact | undefined;
  if (recent.length >= 6 && diffDays(recent.at(-1)!, recent[0]) >= 14) {
    const kgPerDay = slope(recent.map((d) => ({ x: diffDays(d, recent[0]), y: byDay.get(d)!.kg })));
    trend = { id: 'weight.trend', value: r1(kgPerDay * 7), unit: 'kg/week', confidence: 'measured', note: `${recent.length} weigh-ins, ${recent[0]} to ${recent.at(-1)}` };
  } else trust.push(`No weight trend yet: it ${KCAL_FLOOR_NOTE} (has ${recent.length}).`);
  if (odd.length) trust.push(`Odd weigh-in${odd.length > 1 ? 's' : ''} left out: ${odd.map((w) => `${w.kg} kg on ${dayOf(w, dayStart)}`).join(', ')}.`);

  // ── goals ──
  const goals: GoalFact[] = [];
  for (const m of live<MemoryCard>(records, 'memory')) {
    const g = m.goal;
    // an ended or not-yet-started goal is not a current one (it is listed under ENDED, or not yet at all: Codex, PR #73)
    if (!g || (m.validUntil && m.validUntil < today) || m.validFrom > today) continue;
    const base = { memoryId: m.id, text: m.text, metric: g.metric, ...(g.target !== undefined ? { target: g.target } : {}), ...(g.by ? { by: g.by } : {}) };
    if (g.status) { goals.push({ ...base, status: g.status }); continue; }
    if (g.metric !== 'weight' || g.target === undefined || !latest) { goals.push({ ...base, status: 'cantJudge' }); continue; }
    // the direction comes from where the goal started, never from which side of the target the latest weight is on: a cut
    // that went past its target is reached, not "behind" (Codex, PR #73). No start and no weigh-in near the start date: can't judge.
    const startKg = g.start ?? nearest(byDay, g.startDate)?.kg;
    if (startKg === undefined || startKg === g.target) { goals.push({ ...base, status: 'cantJudge' }); continue; }
    const losing = g.target < startKg;
    if (losing ? latest.value <= g.target : latest.value >= g.target) { goals.push({ ...base, status: 'reached' }); continue; }
    // a deadline that passed unreached is missed: no pace is worked out for it until a new date is agreed (Codex, PR #73)
    if (g.by && g.by < today) { goals.push({ ...base, status: 'missed' }); continue; }
    if (!trend || !g.by) { goals.push({ ...base, status: 'cantJudge' }); continue; }
    const weeks = Math.max(diffDays(g.by, today), 1) / 7;
    const needed = r1((g.target - latest.value) / weeks);
    // on pace within 0.1 kg a week; going the right way faster is "ahead", slower or the wrong way is "behind"
    const status = Math.abs(trend.value - needed) <= 0.1 ? 'onPace' : (losing ? trend.value < needed : trend.value > needed) ? 'ahead' : 'behind';
    goals.push({ ...base, status, neededKgPerWeek: needed });
  }

  // ── training ──
  const sessions = live<AnyRecord>(records, 'session') as (AnyRecord & { name: string; state: string })[];
  const finishedIn = (days: number) => sessions.filter((s) => s.state === 'finished' && diffDays(today, dayOf(s, dayStart)) < days && dayOf(s, dayStart) <= today).length;
  const activities7: Record<string, number> = {};
  for (const a of live<AnyRecord>(records, 'activity') as (AnyRecord & { type: string })[]) {
    const d = dayOf(a, dayStart);
    if (d <= today && diffDays(today, d) < 7) activities7[a.type] = (activities7[a.type] ?? 0) + 1;
  }

  return {
    now: { at: o.now, day: today, weekday: weekdayOf(today), hour, partOfDay: partOfDay(hour) },
    person: { ...(settings?.name ? { name: settings.name } : {}), language: settings?.language ?? 'en', targets: targetFacts },
    memory, ended, goals,
    today: {
      food: todayFood, foodComplete: todayComplete, left,
      ...(water ? { water } : {}),
      ...(lastDay === today && latest ? { weighIn: { ...latest, id: 'today.weighIn' } } : {}),
      sessions: sessions.filter((s) => dayOf(s, dayStart) === today).map((s) => ({ name: s.name, state: s.state })),
    },
    food28: { daysLogged: logged.length, daysComplete: done.length, facts: food28 },
    weight: { ...(latest ? { latest, latestDay: lastDay } : {}), ...(trend ? { trend } : {}), odd: odd.map((w) => ({ id: w.id, kg: w.kg, day: dayOf(w, dayStart) })) },
    training: { sessions7: finishedIn(7), sessions28: finishedIn(28), activities7 },
    trust,
  };
}

/** Every number on the sheet, for the code check that each number in an answer is traced to a fact or the message. */
export function sheetNumbers(s: FactSheet): number[] {
  const out: number[] = [];
  const facts = [...s.person.targets, ...s.today.food, ...s.today.left, ...s.food28.facts];
  for (const f of facts) out.push(f.value);
  for (const f of [s.today.water, s.today.weighIn, s.weight.latest, s.weight.trend]) if (f) out.push(f.value);
  for (const g of s.goals) { if (g.target !== undefined) out.push(g.target); if (g.neededKgPerWeek !== undefined) out.push(g.neededKgPerWeek); }
  for (const w of s.weight.odd) out.push(w.kg);
  // memory is the person's own words, shown on the sheet: "my old protein target was 215 g" is a number they gave (Codex, PR #73)
  for (const m of [...s.memory, ...s.ended]) out.push(...numbersIn(m.text));
  out.push(s.food28.daysLogged, s.food28.daysComplete, s.training.sessions7, s.training.sessions28, ...Object.values(s.training.activities7));
  return out;
}

const fmt = (n: number, lang: 'en' | 'da') => n.toLocaleString(lang === 'da' ? 'da-DK' : 'en-GB');
const line = (f: Fact, lang: 'en' | 'da') => `- ${f.id}: ${fmt(f.value, lang)} ${f.unit}${f.confidence !== 'measured' ? ` (${f.confidence})` : ''}${f.note ? `: ${f.note}` : ''}`;

/** The sheet as the prompt sees it: structured lines with ids, never prose the AI could misread. */
export function renderFacts(s: FactSheet): string {
  const L = s.person.language;
  const out: string[] = [`NOW: ${s.now.day}, ${String(s.now.hour).padStart(2, '0')}:00 (${s.now.partOfDay})`];
  if (s.person.name) out.push(`NAME: ${s.person.name}`);
  out.push('TARGETS:', ...(s.person.targets.length ? s.person.targets.map((f) => line(f, L)) : ['- none set']));
  out.push('MEMORY (current, in their words):', ...(s.memory.length ? s.memory.map((m) => `- ${m.id} [${m.topic}] ${m.text}${m.until ? ` (until ${m.until})` : ''}`) : ['- none']));
  if (s.ended.length) out.push('ENDED (past, not current):', ...s.ended.map((m) => `- ${m.id} ${m.text} (ended ${m.endedOn})`));
  if (s.goals.length) out.push('GOALS:', ...s.goals.map((g) => `- ${g.text}: ${g.status}${g.target !== undefined ? `, target ${fmt(g.target, L)}` : ''}${g.by ? ` by ${g.by}` : ''}${g.neededKgPerWeek !== undefined ? `, needs ${fmt(g.neededKgPerWeek, L)} kg/week` : ''}`));
  out.push(`TODAY (food ${s.today.foodComplete ? 'marked complete' : 'not finished'}):`, ...[...s.today.food, ...s.today.left].map((f) => line(f, L)));
  for (const f of [s.today.water, s.today.weighIn]) if (f) out.push(line(f, L));
  if (s.today.sessions.length) out.push(...s.today.sessions.map((x) => `- session: ${x.name} (${x.state})`));
  out.push(`LAST 28 DAYS: food logged ${s.food28.daysLogged} days, ${s.food28.daysComplete} complete; ${s.training.sessions28} sessions (${s.training.sessions7} in the last 7 days)`, ...s.food28.facts.map((f) => line(f, L)));
  const acts = Object.entries(s.training.activities7);
  if (acts.length) out.push(`- activities last 7 days: ${acts.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  out.push('WEIGHT:', ...[s.weight.latest, s.weight.trend].filter((f): f is Fact => !!f).map((f) => line(f, L)));
  if (s.trust.length) out.push('WHAT THE DATA CAN\'T SAY:', ...s.trust.map((t) => `- ${t}`));
  return out.join('\n');
}
