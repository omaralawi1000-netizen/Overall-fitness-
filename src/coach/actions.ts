/**
 * What the Coach can change, and how (docs/COACH.md §3, Answer Bar rule 7). The AI only PROPOSES an action. Code then:
 * 1. validates the parameters (types, ranges, hard safety limits),
 * 2. checks the current state (the record exists, the value really changes),
 * 3. applies it through the engine's action log (one action, Undo-able),
 * 4. verifies it by reading the record back.
 * Only a verified result becomes a "Did in the app" line. A proposal that is consequential (a target, forgetting a card)
 * is shown as a preview first unless the person gave a direct command.
 *
 * The catalog: targets, memory, water, weight, moving a planned session, and logging or correcting a food. More join one by one,
 * each with the same four steps and its own tests.
 */
import type { Engine } from '../engine/engine';
import type { AnyRecord, FoodLog, MemoryCard, MemoryTopic, Plan, Portion, Routine, Settings } from '../engine/model';
import { routineOn } from './training-facts';
import type { NewRecord, Op } from '../engine/plan';
import { dayKeyAt, diffDays, isDayKey } from '../engine/time';
import { deepEqual, newId } from '../engine/util';

export type TargetKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'waterMl';
const TARGET_UNIT: Record<TargetKey, string> = { kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g', fibre: 'g', waterMl: 'ml' };
/** sane ranges; kcal below 1,200 is never set by the Coach (Answer Bar rule 12: very low intake gets care, not a plan) */
const TARGET_RANGE: Record<TargetKey, [number, number]> = { kcal: [1200, 6000], protein: [20, 400], carbs: [20, 900], fat: [20, 300], fibre: [5, 100], waterMl: [500, 6000] };
const TOPICS: readonly MemoryTopic[] = ['about', 'goal', 'promise', 'preference', 'health', 'life'];

export type Proposal =
  | { name: 'set_target'; key: TargetKey; value: number }
  | { name: 'remember'; text: string; topic: MemoryTopic; until?: string }
  | { name: 'forget'; memoryId: string }
  | { name: 'log_water'; ml: number }
  | { name: 'log_weight'; kg: number }
  /** move the session planned on one day to another (one week only; the weekly plan stays) */
  | { name: 'move_session'; from: string; to: string }
  /** a food the person said they ate, with the AI's estimate, stored and shown as an estimate */
  | { name: 'log_food'; food: string; amount: number; unit: FoodUnit; kcal: number; protein: number; meal?: Meal }
  /** a correction to one of today's entries ("no, 2 eggs"): code scales its nutrients, the AI gives only the new amount */
  | { name: 'fix_food'; foodId: string; amount: number };

export type FoodUnit = Portion['unit'];
const FOOD_UNITS: readonly FoodUnit[] = ['g', 'ml', 'piece', 'portion'];
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** how the person asked: a direct command is done at once; a Coach suggestion arrives as a preview */
export type Mode = 'command' | 'proposal';

export type Checked =
  | { ok: true; proposal: Proposal; mode: Mode; preview: boolean; label: string; ops: Op[] }
  | { ok: false; reason: string };

export interface Did { actionId: string; label: string; undo: true }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= max ? v.trim() : null;
const fmtIn = (da: boolean) => (n: number) => n.toLocaleString(da ? 'da-DK' : 'en-GB');
/** what a target is called in a label, in the person's language (a Danish reply never shows "remembered" or "3,000") */
const TARGET_NAME: Record<TargetKey, [string, string]> = { kcal: ['kcal target', 'kaloriemål'], protein: ['protein target', 'proteinmål'], carbs: ['carbs target', 'kulhydratmål'], fat: ['fat target', 'fedtmål'], fibre: ['fibre target', 'fibermål'], waterMl: ['water target', 'vandmål'] };

/** Turn whatever the AI sent into a typed proposal, or say what's wrong with it. Never guesses a missing value. */
export function readProposal(raw: unknown): Proposal | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'not an object' };
  const o = raw as Record<string, unknown>;
  switch (o.name) {
    case 'set_target':
      if (!Object.hasOwn(TARGET_RANGE, String(o.key))) return { error: `unknown target ${String(o.key)}` };
      if (!isNum(o.value)) return { error: 'value is not a number' };
      return { name: 'set_target', key: o.key as TargetKey, value: Math.round(o.value) };
    case 'remember': {
      const text = str(o.text, 200);
      if (!text) return { error: 'memory text must be 2–200 characters' };
      if (!TOPICS.includes(o.topic as MemoryTopic)) return { error: `unknown topic ${String(o.topic)}` };
      if (o.until !== undefined && !(typeof o.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.until))) return { error: 'until must be YYYY-MM-DD' };
      return { name: 'remember', text, topic: o.topic as MemoryTopic, ...(o.until ? { until: o.until as string } : {}) };
    }
    case 'forget':
      return typeof o.memoryId === 'string' && o.memoryId ? { name: 'forget', memoryId: o.memoryId } : { error: 'no memoryId' };
    case 'log_water':
      return isNum(o.ml) ? { name: 'log_water', ml: Math.round(o.ml) } : { error: 'ml is not a number' };
    case 'log_weight':
      return isNum(o.kg) ? { name: 'log_weight', kg: Math.round(o.kg * 10) / 10 } : { error: 'kg is not a number' };
    case 'move_session':
      return isDayKey(o.from) && isDayKey(o.to) ? { name: 'move_session', from: o.from, to: o.to } : { error: 'from and to must be YYYY-MM-DD' };
    case 'log_food': {
      const food = str(o.food, 80);
      if (!food) return { error: 'food name must be 2–80 characters' };
      if (!isNum(o.amount) || !FOOD_UNITS.includes(o.unit as FoodUnit)) return { error: 'amount and unit (g, ml, piece, portion) are needed' };
      if (!isNum(o.kcal) || !isNum(o.protein)) return { error: 'kcal and protein estimates are needed' };
      if (o.meal !== undefined && !MEALS.includes(o.meal as Meal)) return { error: `unknown meal ${String(o.meal)}` };
      return { name: 'log_food', food, amount: Math.round(o.amount * 10) / 10, unit: o.unit as FoodUnit, kcal: Math.round(o.kcal), protein: Math.round(o.protein), ...(o.meal ? { meal: o.meal as Meal } : {}) };
    }
    case 'fix_food':
      return typeof o.foodId === 'string' && o.foodId && isNum(o.amount) ? { name: 'fix_food', foodId: o.foodId, amount: Math.round(o.amount * 10) / 10 } : { error: 'foodId and amount are needed' };
    default:
      return { error: `unknown action ${String(o.name)}` };
  }
}

/** Steps 1 and 2: validate and check against the current state. Pure: nothing is written here. */
export function check(p: Proposal, mode: Mode, o: { records: AnyRecord[]; now: number; tz: string }): Checked {
  const settings = o.records.find((r): r is Settings => r.kind === 'settings' && !r.deleted);
  const day = dayKeyAt(o.now, o.tz, settings?.dayStartHour ?? 0);
  const da = settings?.language === 'da';
  const fmt = fmtIn(da);
  const ok = (preview: boolean, label: string, ops: Op[]): Checked => ({ ok: true, proposal: p, mode, preview, label, ops });
  switch (p.name) {
    case 'set_target': {
      const [lo, hi] = TARGET_RANGE[p.key];
      if (p.value < lo || p.value > hi) return { ok: false, reason: `${p.key} target ${p.value} is outside ${lo}–${hi}` };
      const before = settings?.targets[p.key];
      if (before === p.value) return { ok: false, reason: `${p.key} target is already ${p.value}` };
      const unit = TARGET_UNIT[p.key];
      const label = `${TARGET_NAME[p.key][da ? 1 : 0]} ${before !== undefined ? `${fmt(before)} → ` : ''}${fmt(p.value)} ${unit}`;
      // no live settings: bring back one Undo removed (an id is never created twice, even deleted: Codex, PR #73), else create
      const gone = o.records.find((r): r is Settings => r.kind === 'settings' && !!r.deleted);
      const ops: Op[] = settings
        ? [{ op: 'update', id: settings.id, set: { targets: { ...settings.targets, [p.key]: p.value } } }]
        : gone
          ? [{ op: 'update', id: gone.id, set: { deleted: null, targets: { [p.key]: p.value } } }]
          : [{ op: 'create', record: { id: 'settings', kind: 'settings', language: 'en', dayStartHour: 0, weekStart: 1, units: { weight: 'kg', distance: 'km', length: 'cm' }, restDefaultSec: 120, targets: { [p.key]: p.value } } as NewRecord }];
      return ok(mode === 'proposal', label, ops);
    }
    case 'remember': {
      // only a current card is a duplicate: "exam week" that ended in October can be remembered again for November (Codex, PR #73)
      const same = o.records.find((r): r is MemoryCard => r.kind === 'memory' && !r.deleted && r.text.toLowerCase() === p.text.toLowerCase() && !(r.validUntil && r.validUntil < day));
      if (same) return { ok: false, reason: 'already remembered' };
      const id = newId('m');
      const record = { id, kind: 'memory', day, text: p.text, topic: p.topic, scope: p.until ? 'oneOff' : 'standing', validFrom: day, lastSeen: o.now, origin: mode === 'command' ? 'said' : 'agreed', ...(p.until ? { validUntil: p.until } : {}) } as NewRecord;
      return ok(mode === 'proposal', `${da ? 'huskede' : 'remembered'} "${p.text}"`, [{ op: 'create', record }]);
    }
    case 'forget': {
      const m = o.records.find((r): r is MemoryCard => r.id === p.memoryId && r.kind === 'memory');
      if (!m || m.deleted) return { ok: false, reason: 'no such memory' };
      return ok(mode === 'proposal', `${da ? 'glemte' : 'forgot'} "${m.text}"`, [{ op: 'delete', id: m.id }]);
    }
    case 'log_water':
      if (p.ml < 50 || p.ml > 3000) return { ok: false, reason: `${p.ml} ml is outside 50–3,000` };
      return ok(false, da ? `loggede ${fmt(p.ml)} ml vand` : `logged ${fmt(p.ml)} ml water`, [{ op: 'create', record: { id: newId('w'), kind: 'water', day, ml: p.ml } as NewRecord }]);
    case 'log_weight':
      if (p.kg < 30 || p.kg > 300) return { ok: false, reason: `${p.kg} kg is outside 30–300` };
      return ok(false, `${da ? 'loggede' : 'logged'} ${fmt(p.kg)} kg`, [{ op: 'create', record: { id: newId('bw'), kind: 'bodyweight', day, kg: p.kg } as NewRecord }]);
    case 'move_session': {
      const plan = o.records.find((r): r is Plan => r.kind === 'plan' && !r.deleted);
      if (!plan || plan.mode !== 'weekly') return { ok: false, reason: 'no weekly plan to move a session in' };
      if (p.from < day || p.to < day) return { ok: false, reason: 'a past day cannot be moved' };
      if (diffDays(p.to, day) > 14 || diffDays(p.from, day) > 14) return { ok: false, reason: 'only the next two weeks can be moved' };
      if (p.from === p.to) return { ok: false, reason: 'the session is already on that day' };
      const moving = routineOn(plan, p.from);
      if (!moving) return { ok: false, reason: `nothing is planned on ${p.from}` };
      const routines = new Map(o.records.filter((r): r is Routine => r.kind === 'routine' && !r.deleted).map((r) => [r.id, r.name]));
      const name = routines.get(moving) ?? moving;
      const replaced = routineOn(plan, p.to);
      const fromOverride = plan.overrides.find((x) => x.date === p.from);
      // leaving a day: an override is taken off (the day goes back to its weekly routine); a weekly day is cleared
      let overrides = plan.overrides.filter((x) => x.date !== p.from && x.date !== p.to);
      let cleared = plan.cleared.filter((d) => d !== p.to);
      // a session the Coach moved here (its origin is another day) leaves the day's own weekly routine behind; anything else
      // leaves the day empty. Origin, not routine name, tells them apart: Pull Tue and Thu stays Pull Thu (Codex, PR #82)
      if (!(fromOverride?.originDate && fromOverride.originDate !== p.from)) cleared = [...cleared, p.from];
      overrides = [...overrides, { date: p.to, routineId: moving, originDate: fromOverride?.originDate ?? p.from }];
      const label = `${da ? 'flyttede' : 'moved'} ${name} ${dayName(p.from, da)} → ${dayName(p.to, da)}${replaced && replaced !== moving ? ` (${da ? 'i stedet for' : 'instead of'} ${routines.get(replaced) ?? replaced})` : ''}`;
      return ok(mode === 'proposal', label, [{ op: 'update', id: plan.id, set: { overrides, cleared } }]);
    }
    case 'log_food': {
      if (p.amount <= 0 || p.amount > (p.unit === 'g' || p.unit === 'ml' ? 3000 : 20)) return { ok: false, reason: `${p.amount} ${p.unit} is not a plausible amount` };
      if (p.kcal < 0 || p.kcal > 4000 || p.protein < 0 || p.protein > 250) return { ok: false, reason: 'the estimate is out of range' };
      // protein has 4 kcal a gram and nothing has more than 9 kcal a gram: an estimate that breaks either is wrong
      if (p.protein * 4 > p.kcal + 20) return { ok: false, reason: 'more protein than the calories allow' };
      if ((p.unit === 'g' || p.unit === 'ml') && p.kcal > p.amount * 9.5) return { ok: false, reason: 'more calories than that weight can hold' };
      const portion: Portion = { amount: p.amount, unit: p.unit };
      const record = { id: newId('f'), kind: 'food', day, name: p.food, meal: p.meal ?? mealAt(o.now, o.tz), dataSource: 'estimate', portion, ...(p.unit === 'g' ? { grams: p.amount } : p.unit === 'ml' ? { ml: p.amount } : {}), estimated: true, nutrients: { kcal: p.kcal, protein: p.protein } } as NewRecord;
      return ok(false, `${da ? 'loggede' : 'logged'} ${p.food}, ${fmt(p.amount)} ${unitWord(p.unit, p.amount, da)} (${da ? 'skøn' : 'estimate'}: ${fmt(p.kcal)} kcal, ${fmt(p.protein)} g protein)`, [{ op: 'create', record }]);
    }
    case 'fix_food': {
      const f = o.records.find((r): r is FoodLog => r.id === p.foodId && r.kind === 'food' && !r.deleted);
      if (!f) return { ok: false, reason: 'no such food entry' };
      if ((f.day ?? dayKeyAt(f.at, f.tz, settings?.dayStartHour ?? 0)) !== day) return { ok: false, reason: "only today's entries can be corrected here" };
      if (p.amount <= 0 || f.portion.amount <= 0) return { ok: false, reason: 'the new amount must be above 0' };
      if (p.amount === f.portion.amount) return { ok: false, reason: `that entry is already ${p.amount} ${f.portion.unit}` };
      const k = p.amount / f.portion.amount;
      const nutrients = Object.fromEntries(Object.entries(f.nutrients).map(([n, v]) => [n, Math.round((v as number) * k * 10) / 10]));
      const set = { portion: { ...f.portion, amount: p.amount }, nutrients, ...(f.grams !== undefined ? { grams: Math.round(f.grams * k * 10) / 10 } : {}), ...(f.ml !== undefined ? { ml: Math.round(f.ml * k * 10) / 10 } : {}) };
      return ok(false, `${da ? 'rettede' : 'changed'} ${f.name} ${fmt(f.portion.amount)} → ${fmt(p.amount)} ${unitWord(f.portion.unit, p.amount, da)}`, [{ op: 'update', id: f.id, set }]);
    }
  }
}

const DAY_NAMES: [string[], string[]] = [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør']];
const MONTHS: [string[], string[]] = [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.']];
const weekdayOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
/** "Thu 5 Nov" / "tor 5. nov." */
const dayName = (d: string, da: boolean) => `${DAY_NAMES[da ? 1 : 0][weekdayOf(d)]} ${Number(d.slice(8))}${da ? '.' : ''} ${MONTHS[da ? 1 : 0][Number(d.slice(5, 7)) - 1]}`;
const unitWord = (u: FoodUnit, n: number, da: boolean) => (u === 'piece' ? (da ? 'stk.' : n === 1 ? 'piece' : 'pieces') : u === 'portion' ? (da ? (n === 1 ? 'portion' : 'portioner') : n === 1 ? 'portion' : 'portions') : u);
/** a food logged with no meal goes where the hour puts it */
function mealAt(now: number, tz: string): Meal {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now));
  return h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h >= 17 && h < 22 ? 'dinner' : 'snack';
}

/** Is the change really there now? Read back, never assumed. */
function verify(c: Extract<Checked, { ok: true }>, e: Engine): boolean {
  const p = c.proposal;
  const op = c.ops[0];
  const id = op.op === 'create' ? (op.record as { id: string }).id : op.op === 'put' ? op.record.id : op.id;
  const r = e.get(id) as (AnyRecord & Record<string, unknown>) | undefined;
  switch (p.name) {
    case 'set_target': return !!r && !r.deleted && (r as unknown as Settings).targets?.[p.key] === p.value;
    case 'remember': return !!r && !r.deleted && (r as unknown as MemoryCard).text === p.text;
    case 'forget': return !!r && !!r.deleted;
    case 'log_water': return !!r && !r.deleted && r.ml === p.ml;
    case 'log_weight': return !!r && !r.deleted && r.kg === p.kg;
    case 'move_session': { const plan = r as unknown as Plan | undefined; return !!plan && !plan.deleted && routineOn(plan, p.to) === (op.op === 'update' ? (op.set as Partial<Plan>).overrides?.find((x) => x.date === p.to)?.routineId : undefined) && routineOn(plan, p.from) !== routineOn(plan, p.to); }
    case 'log_food': return !!r && !r.deleted && (r as unknown as FoodLog).nutrients.kcal === p.kcal;
    case 'fix_food': return !!r && !r.deleted && (r as unknown as FoodLog).portion.amount === p.amount;
  }
}

/**
 * An action already in the log, from memory or (when it fell out of the recent history) the database: a retry reports
 * what that action did, verified record by record, and never writes again.
 */
async function saved(e: Engine, actionId: string): Promise<{ did: Did } | { failed: string } | null> {
  const a = e.actions().find((x) => x.id === actionId) ?? (await e.allActions()).find((x) => x.id === actionId);
  if (!a) return null;
  if (a.undoneBy) return { failed: 'this change was undone' };
  // every field the action wrote must still hold its value: a target changed again since is superseded, not done (Codex, PR #73)
  const there = a.changes.every((ch) => {
    const r = e.get(ch.id) as Record<string, unknown> | undefined;
    return !!r && !!r.deleted === !!ch.after.deleted && Object.entries(ch.after).every(([k, v]) => deepEqual(r[k] ?? null, v ?? null));
  });
  return there ? { did: { actionId, label: a.label, undo: true } } : { failed: 'this change was replaced by a later one' };
}

/**
 * Steps 3 and 4: apply through the action log, then verify. Returns a `Did` only when the change is really there.
 * `actionId` is made once per proposal by the caller, so a retry can never apply it twice.
 * The proposal is checked again against the records as they are NOW: a preview applied later, or two proposals checked
 * together, can never write a stale state over a newer change (Codex, PR #73).
 */
export async function apply(e: Engine, c: Extract<Checked, { ok: true }>, actionId: string, o: { now: number; tz: string }): Promise<{ did: Did } | { failed: string }> {
  const before = await saved(e, actionId);
  if (before) return before;
  const fresh = check(c.proposal, c.mode, { records: e.allRecords(), now: o.now, tz: o.tz });
  if (!fresh.ok) return { failed: fresh.reason };
  const res = await e.commit({ id: actionId, type: `coach.${fresh.proposal.name}`, label: fresh.label, source: 'coach', ops: fresh.ops });
  // a retry racing the first try: the action that was really written is the one to verify, not this new plan (Codex, PR #73)
  if (res.status === 'duplicate') return (await saved(e, actionId)) ?? { failed: 'saved earlier, but the change cannot be found' };
  if (res.status !== 'saved') return { failed: res.error?.message ?? res.status };
  if (!verify(fresh, e)) return { failed: 'the change is not there after saving' };
  return { did: { actionId, label: fresh.label, undo: true } };
}

/** The "Did in the app" lines, written by code from verified results only. */
export function didLines(dids: Did[], lang: 'en' | 'da' = 'en'): string {
  if (!dids.length) return '';
  return `${lang === 'da' ? 'Gjort i appen' : 'Did in the app'}: ${dids.map((d) => d.label).join('; ')} · Undo`;
}
