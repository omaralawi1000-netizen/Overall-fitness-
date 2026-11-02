/**
 * Import from old Aven: one way, read only (DATA-MODEL.md §8).
 *
 * Sources: old Aven's backup file (`{ app: 'aven', v, data }`), or the one-tap copy, which READS old Aven's saved data on
 * the same site (`aven.v1`, `aven.v1.active`). Nothing is ever written to an `aven…` key or database.
 *
 * A dry run reports what would come over, what is skipped and why. Ids come from the old ids (`old:<kind>:<id>`), so
 * importing again never duplicates; a record already here is left alone and one deleted here stays deleted. The import is
 * ONE action, so one Undo takes it all back.
 *
 * Old Aven's data is read defensively, like its own `normaliseData`: a damaged item is skipped and counted, never guessed.
 */
import type { Engine, Result } from './engine';
import { SCHEMA, type Activity, type ActivityType, type AnyRecord, type Bodyweight, type CustomExercise, type FoodDataSource, type FoodLog, type HealthDay, type MemoryCard,
  type MemoryTopic, type Measurement, type Nutrients, type Plan, type Routine, type Session, type Settings, type Slot, type Water, type WorkSet, type Equipment, type LogType } from './model';
import type { Op } from './plan';
import { checkRecord } from './plan';
import { dayKeyAt, isDayKey, wallClock } from './time';
import { newId } from './util';
import { summarise, countKinds } from './backup';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface Skipped { what: string; count: number; why: string }
export interface Mapped { records: AnyRecord[]; skipped: Skipped[] }
export interface Report {
  /** what old Aven's data held that comes over, by kind */
  found: Partial<Record<AnyRecord['kind'], number>>;
  summary: string;
  /** will be written (new to Aven 2) */
  toAdd: number;
  /** already here (an earlier import): left alone */
  already: number;
  /** imported before and deleted here since: stays deleted */
  deletedHere: number;
  skipped: Skipped[];
  /** the records to write: the caller passes the report back to `runImport` */
  add: AnyRecord[];
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const arr = (x: unknown): Any[] => (Array.isArray(x) ? x : []);

/** Old Aven's backup file text → its data, or why not. */
export function readOldBackup(text: string): { ok: true; data: Any; photos: number; chat: number } | { ok: false; detail: string } {
  let j: Any;
  try { j = JSON.parse(text); } catch { return { ok: false, detail: 'The file is damaged or cut off (it is not complete JSON).' }; }
  if (j?.app === 'a2-backup') return { ok: false, detail: 'This is an Aven 2 backup. Use "Restore" instead.' };
  if (j?.app !== 'aven' || !j.data || typeof j.data !== 'object') return { ok: false, detail: 'This is not an old Aven backup.' };
  if (typeof j.v !== 'number' || j.v > 1) return { ok: false, detail: `This old Aven backup has a format Aven 2 doesn't know yet (v${j.v}).` };
  return { ok: true, data: j.data, photos: j.photos && typeof j.photos === 'object' ? Object.keys(j.photos).length : 0, chat: Array.isArray(j.chat) ? j.chat.length : 0 };
}

/** The one-tap copy: old Aven's saved data on this site, read only. Null when there is none. */
export function readOldLocal(ls: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Any | null {
  try {
    const raw = ls?.getItem('aven.v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    // a workout saved more recently than the full copy lives in its own key (old store.ts)
    const act = ls?.getItem('aven.v1.active');
    if (act) { try { const a = JSON.parse(act); if (a && 'active' in a) data.active = a.active; } catch { /* the full copy's stands */ } }
    return data;
  } catch { return null; }
}

const TOPIC: Record<string, MemoryTopic> = { goal: 'goal', preference: 'preference', health: 'health', schedule: 'about', gear: 'about', food: 'preference', other: 'about' };
const ACT: Record<string, ActivityType> = { wrestling: 'wrestling', run: 'run', walk: 'walk', cycle: 'cycle', swim: 'swim', row: 'row', hike: 'hike', mobility: 'mobility' };
const SRC: Record<string, FoodDataSource> = { reference: 'reference', off: 'off', usda: 'reference', custom: 'custom', recipe: 'recipe', quick: 'quick' };
const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar', 'satFat', 'sodium'] as const;

/**
 * Old Aven's data → Aven 2 records, plus what was skipped and why. Pure: `now` and `tz` are given (the time zone is the
 * phone's at import time; old Aven didn't store one).
 */
export function mapOld(data: Any, o: { now: number; tz: string; photos?: number; chat?: number }): Mapped {
  const out: AnyRecord[] = [];
  const skipped: Skipped[] = [];
  const skip = (what: string, count: number, why: string) => { if (count > 0) skipped.push({ what, count, why }); };
  const damaged = new Map<string, number>();
  const bad = (what: string) => damaged.set(what, (damaged.get(what) ?? 0) + 1);
  const env = (id: string, at: number, day: string | undefined) => ({ id, v: SCHEMA, at, tz: o.tz, ...(day ? { day } : {}), source: 'import' as const, createdAt: at, updatedAt: at, rev: 1 });
  /** a day's noon, for old records that only had a day */
  const noon = (day: string) => {
    const base = Date.parse(`${day}T12:00:00Z`);
    const w = wallClock(base, o.tz);
    return base - ((w.h - 12) * 60 + w.min) * 60000;
  };
  const push = (r: AnyRecord, what: string) => { if (checkRecord(r)) bad(what); else out.push(r); };

  // custom exercises: their ids change (old:exercise:…), so routines and workouts are pointed at the new ids
  const customIds = new Map<string, string>();
  for (const x of arr(data.exercises)) {
    if (!str(x?.id) || !str(x?.name)) { bad('custom exercises'); continue; }
    const id = `old:exercise:${x.id}`;
    customIds.set(x.id, id);
    const equipment = arr(x.equipment).filter(str) as Equipment[];
    push({ ...env(id, o.now, undefined), kind: 'exercise', name: x.name, ...(str(x.nameDa) ? { nameDa: x.nameDa } : {}), family: id, variant: { equipment: equipment[0] ?? 'other' },
      muscles: arr(x.muscles).filter(str), equipment, logType: (str(x.logType) ? x.logType : 'weightReps') as LogType, ...(Array.isArray(x.aka) ? { aka: x.aka.filter(str) } : {}) } as CustomExercise, 'custom exercises');
  }
  const exId = (id: string) => customIds.get(id) ?? id;

  // workouts
  let running = 0;
  if (data.active && typeof data.active === 'object') running++;
  for (const s of arr(data.sessions)) {
    if (!str(s?.id) || !num(s.startedAt) || !isDayKey(s.date)) { bad('workouts'); continue; }
    if (s.status !== 'done') { running++; continue; }
    const sid = `old:session:${s.id}`;
    const ended = num(s.endedAt) ? s.endedAt : s.startedAt;
    push({ ...env(sid, s.startedAt, s.date), kind: 'session', name: str(s.name) ? s.name : 'Workout', state: 'finished',
      events: [{ type: 'start', at: s.startedAt }, { type: 'finish', at: ended }], startedAt: s.startedAt, endedAt: ended, pausedMs: num(s.pausedMs) ? s.pausedMs : 0,
      ...(str(s.routineId) ? { routineId: `old:routine:${s.routineId}` } : {}), ...(isDayKey(s.plannedDate) ? { plannedDay: s.plannedDate } : {}), ...(str(s.note) ? { note: s.note } : {}) } as Session, 'workouts');
    arr(s.exercises).forEach((x: Any, i: number) => {
      if (!str(x?.id) || !str(x.exerciseId)) { bad('workout exercises'); return; }
      const slotId = `old:slot:${s.id}:${x.id}`;
      push({ ...env(slotId, s.startedAt, s.date), kind: 'slot', sessionId: sid, exerciseId: exId(x.exerciseId), order: i,
        ...(str(x.note) ? { note: x.note } : {}), ...(num(x.restSec) ? { restSec: x.restSec } : {}), ...(str(x.supersetGroup) ? { supersetGroup: x.supersetGroup } : {}) } as Slot, 'workout exercises');
      arr(x.sets).forEach((t: Any, j: number) => {
        if (!str(t?.id)) { bad('sets'); return; }
        const vals = { ...(num(t.weightKg) ? { kg: t.weightKg } : {}), ...(num(t.reps) ? { reps: t.reps } : {}), ...(num(t.durationSec) ? { durationSec: t.durationSec } : {}), ...(num(t.distanceM) ? { distanceM: t.distanceM } : {}) };
        const target = t.target && typeof t.target === 'object' ? { ...(num(t.target.repMin) ? { repMin: t.target.repMin } : {}), ...(num(t.target.repMax) ? { repMax: t.target.repMax } : {}), ...(num(t.target.weightKg) ? { kg: t.target.weightKg } : {}) } : undefined;
        // a ticked set is what was done; an unticked one only ever held the plan's numbers (nothing is invented as done)
        const planned = target && Object.keys(target).length ? target : !t.done && Object.keys(vals).length ? vals : undefined;
        const done = t.done ? { ...vals, ...(num(t.rpe) ? { rpe: t.rpe } : {}), ...(num(t.rir) ? { rir: t.rir } : {}), at: num(t.completedAt) ? t.completedAt : ended } : undefined;
        push({ ...env(`old:set:${s.id}:${t.id}`, done?.at ?? s.startedAt, s.date), kind: 'set', sessionId: sid, slotId, order: j, type: t.type === 'warmup' ? 'warmup' : 'working',
          ...(planned ? { planned } : {}), ...(done ? { done } : {}) } as WorkSet, 'sets');
      });
    });
  }
  skip('workout still running in old Aven', running, 'Finish or discard it in old Aven first, then import again (it will be added then, nothing else doubles).');

  // food
  for (const f of arr(data.entries)) {
    const snap = f?.snap, qty = f?.qty;
    if (!str(f?.id) || !isDayKey(f.date) || !num(f.at) || !snap || !str(snap.name) || !qty || !num(qty.amount)) { bad('food'); continue; }
    const nutrients: Nutrients = {};
    for (const k of NUTRIENTS) if (num(f.nutrients?.[k])) nutrients[k] = f.nutrients[k];
    const portion = qty.unit === 'g' || qty.unit === 'ml' ? { amount: qty.amount, unit: qty.unit }
      : { amount: qty.amount, unit: 'portion' as const, ...(str(arr(snap.portions).find((p: Any) => p?.id === qty.portionId)?.label) ? { label: arr(snap.portions).find((p: Any) => p?.id === qty.portionId).label } : {}) };
    const basisAmount = num(f.base) ? (snap.basis === 'ml' ? { ml: f.base } : { grams: f.base }) : {};
    push({ ...env(`old:food:${f.id}`, f.at, f.date), kind: 'food', name: snap.name, meal: str(f.mealId) ? f.mealId : 'snacks', ...(str(snap.foodId) ? { foodRef: `old:${snap.foodId}` } : {}),
      dataSource: f.quick ? 'quick' : SRC[snap.source] ?? 'custom', portion, ...basisAmount, ...(['raw', 'cooked', 'dry'].includes(snap.state) ? { state: snap.state } : {}),
      estimated: !!f.estimated, nutrients, ...(str(snap.brand) ? { brand: snap.brand } : {}), ...(str(f.note) ? { note: f.note } : {}) } as FoodLog, 'food');
  }

  for (const w of arr(data.water)) {
    if (!str(w?.id) || !isDayKey(w.date) || !num(w.ml) || !num(w.at)) { bad('water'); continue; }
    push({ ...env(`old:water:${w.id}`, w.at, w.date), kind: 'water', ml: w.ml } as Water, 'water');
  }
  for (const w of arr(data.weights)) {
    if (!str(w?.id) || !isDayKey(w.date) || !num(w.kg) || !num(w.at)) { bad('weigh-ins'); continue; }
    push({ ...env(`old:bodyweight:${w.id}`, w.at, w.date), kind: 'bodyweight', kg: w.kg } as Bodyweight, 'weigh-ins');
  }
  let noTime = 0;
  for (const m of arr(data.measurements)) {
    if (!str(m?.id) || !isDayKey(m.date) || !num(m.cm) || !str(m.kind)) { bad('measurements'); continue; }
    noTime++;
    push({ ...env(`old:measurement:${m.id}`, noon(m.date), m.date), kind: 'measurement', part: m.kind, cm: m.cm } as Measurement, 'measurements');
  }
  for (const a of arr(data.activities)) {
    if (!str(a?.id) || !isDayKey(a.date) || !num(a.durationSec) || !num(a.at)) { bad('activities'); continue; }
    const type = ACT[a.kind] ?? 'other';
    push({ ...env(`old:activity:${a.id}`, a.at, a.date), kind: 'activity', type, durationSec: a.durationSec,
      ...(num(a.startAt) ? { startAt: a.startAt } : {}), ...(num(a.distanceM) ? { distanceM: a.distanceM } : {}), ...(num(a.rounds) ? { rounds: a.rounds } : {}),
      ...([1, 2, 3].includes(a.intensity) ? { intensity: a.intensity } : {}), ...(num(a.kcal) ? { kcal: a.kcal } : {}), ...(num(a.avgHr) ? { avgHr: a.avgHr } : {}), ...(num(a.maxHr) ? { maxHr: a.maxHr } : {}),
      ...(str(a.note) ? { note: a.note } : {}), ...(str(a.name) ? { name: a.name } : type === 'other' && str(a.kind) ? { name: a.kind } : {}) } as Activity, 'activities');
  }

  // the watch: steps and the rest of each day, one health day per date
  const days = new Map<string, Record<string, number>>();
  for (const s of arr(data.steps)) { if (!isDayKey(s?.date) || !num(s.count)) { bad('step days'); continue; } days.set(s.date, { ...days.get(s.date), steps: s.count }); }
  const HKEYS = ['activeKcal', 'totalKcal', 'distanceM', 'floors', 'restHr', 'hrv', 'spo2', 'respRate', 'vo2max', 'weightKg', 'bodyFat', 'leanKg', 'bmr', 'sleepMin', 'deepMin', 'remMin', 'lightMin', 'awakeMin', 'sleepStart', 'sleepEnd'];
  for (const h of arr(data.health)) {
    if (!isDayKey(h?.date)) { bad('health days'); continue; }
    const v: Record<string, number> = { ...days.get(h.date) };
    for (const k of HKEYS) if (num(h[k])) v[k] = h[k];
    days.set(h.date, v);
  }
  for (const [day, v] of days) push({ ...env(`health:${day}`, noon(day), day), kind: 'healthDay', ...v } as HealthDay, 'health days');

  // the Coach's memory
  for (const m of arr(data.memory)) {
    if (!str(m?.id) || !str(m.text) || !num(m.at)) { bad('memory notes'); continue; }
    const g = m.goal;
    const goal = g && typeof g === 'object' && ['weight', 'lift', 'other'].includes(g.metric) && isDayKey(g.startDate) ? {
      metric: g.metric, startDate: g.startDate, ...(num(g.target) ? { target: g.target } : {}), ...(num(g.reps) ? { reps: g.reps } : {}), ...(isDayKey(g.by) ? { by: g.by } : {}),
      ...(num(g.start) ? { start: g.start } : {}), ...(['done', 'dropped'].includes(g.status) ? { status: g.status } : {}), ...(isDayKey(g.endedOn) ? { endedOn: g.endedOn } : {}), ...(str(g.plan) ? { plan: g.plan } : {}) } : undefined;
    push({ ...env(`old:memory:${m.id}`, m.at, dayKeyAt(m.at, o.tz)), kind: 'memory', text: m.text.trim(), topic: TOPIC[m.kind] ?? 'about', scope: 'standing',
      validFrom: dayKeyAt(m.at, o.tz), ...(isDayKey(m.until) ? { validUntil: m.until } : {}), lastSeen: num(m.updatedAt) ? m.updatedAt : m.at, origin: 'said',
      ...(Array.isArray(m.exerciseIds) && m.exerciseIds.length ? { exerciseIds: m.exerciseIds.filter(str).map(exId) } : {}), ...(goal ? { goal } : {}),
      ...(Array.isArray(m.was) && m.was.length ? { was: m.was.filter((w: Any) => str(w?.text) && num(w.at)).map((w: Any) => ({ text: w.text, at: w.at })) } : {}) } as MemoryCard, 'memory notes');
  }

  // routines and the plan
  for (const r of arr(data.routines)) {
    if (!str(r?.id) || !str(r.name)) { bad('routines'); continue; }
    const items = arr(r.items).filter((i: Any) => str(i?.id) && str(i.exerciseId)).map((i: Any) => ({ id: i.id, exerciseId: exId(i.exerciseId), warmupSets: num(i.warmupSets) ? i.warmupSets : 0,
      workingSets: num(i.workingSets) ? i.workingSets : 3, repMin: num(i.repMin) ? i.repMin : 8, repMax: num(i.repMax) ? i.repMax : 12, restSec: num(i.restSec) ? i.restSec : 120,
      ...(str(i.supersetGroup) ? { supersetGroup: i.supersetGroup } : {}), ...(str(i.note) ? { note: i.note } : {}), ...(num(i.targetDurationSec) ? { targetDurationSec: i.targetDurationSec } : {}), ...(num(i.targetDistanceM) ? { targetDistanceM: i.targetDistanceM } : {}) }));
    const at = num(r.createdAt) ? r.createdAt : o.now;
    push({ ...env(`old:routine:${r.id}`, at, undefined), updatedAt: num(r.updatedAt) ? r.updatedAt : at, kind: 'routine', name: r.name, items, ...(str(r.note) ? { note: r.note } : {}), ...(isDayKey(r.oneOff) ? { oneOff: r.oneOff } : {}) } as Routine, 'routines');
  }
  const sc = data.schedule;
  if (sc && typeof sc === 'object') {
    const rid = (x: unknown) => (str(x) ? `old:routine:${x}` : null);
    const weekly: Record<number, string | null> = {};
    for (let d = 0; d < 7; d++) weekly[d] = rid(sc.weekly?.[d]);
    const activities: Record<number, ActivityType[]> = {};
    for (let d = 0; d < 7; d++) { const l = arr(sc.activities?.[d]).map((k: string) => ACT[k]).filter(Boolean); if (l.length) activities[d] = l; }
    push({ ...env('plan', o.now, undefined), kind: 'plan', mode: sc.mode === 'rotation' ? 'rotation' : 'weekly', weekly,
      rotation: { order: arr(sc.rotation?.order).filter(str).map((x: string) => `old:routine:${x}`), pointer: num(sc.rotation?.pointer) ? sc.rotation.pointer : 0, perWeek: num(sc.rotation?.perWeek) ? sc.rotation.perWeek : 3 },
      overrides: arr(sc.overrides).filter((x: Any) => isDayKey(x?.date) && str(x.routineId)).map((x: Any) => ({ date: x.date, routineId: `old:routine:${x.routineId}`, ...(isDayKey(x.originDate) ? { originDate: x.originDate } : {}) })),
      cleared: arr(sc.cleared).filter(isDayKey), activities } as Plan, 'plan');
  }

  // settings
  const st = data.settings;
  if (st && typeof st === 'object') {
    const g = st.goals ?? {};
    const targets: Settings['targets'] = {};
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'waterMl'] as const) if (num(g[k])) targets[k] = g[k];
    push({ ...env('settings', o.now, undefined), kind: 'settings', language: st.language === 'da' ? 'da' : 'en',
      dayStartHour: num(st.dayStartHour) && st.dayStartHour >= 0 && st.dayStartHour <= 6 ? st.dayStartHour : 0, weekStart: st.weekStart === 0 ? 0 : 1,
      units: { weight: st.units?.weight === 'lb' ? 'lb' : 'kg', distance: st.units?.distance === 'mi' ? 'mi' : 'km', length: st.units?.length === 'in' ? 'in' : 'cm' },
      restDefaultSec: num(st.restDefaultSec) ? st.restDefaultSec : 120, targets, ...(str(st.name) ? { name: st.name } : {}) } as Settings, 'settings');
  }

  // what doesn't come over yet, and why
  const n = (k: string) => arr(data[k]).length;
  const keys = (k: string) => (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]) ? Object.keys(data[k]).length : 0);
  const LATER = 'Comes with the Food phase. Importing again then adds it, without doubling anything.';
  skip('custom foods', n('foods'), LATER);
  skip('saved meals', n('savedMeals'), LATER);
  skip('recipes', n('recipes'), LATER);
  skip('remembered dictation choices', keys('choices'), LATER);
  skip('per-exercise weight jumps', keys('increments'), 'Comes with the Workout phase. Importing again then adds them.');
  skip('heavy-day catch-ups', n('catchUps'), 'The Coach phase decides these again from your food log.');
  skip('target history', n('targets'), 'Comes with the Food phase (judging each day against its own target). Your current targets did come over.');
  skip('weekly reviews', n('reviews'), 'Comes with the Coach phase.');
  skip('daily notes', n('notes'), 'Comes with the Coach phase.');
  skip('progress photos', Math.max(n('photos'), o.photos ?? 0), 'Comes with the Progress phase. They stay safe in old Aven.');
  skip('Coach chat messages', o.chat ?? 0, 'Comes with the Coach phase. They stay safe in old Aven.');
  if (data.demo) skipped.push({ what: 'demo data', count: 1, why: 'Old Aven still had its demo data switched on: some workouts or foods may be made up.' });
  if (noTime) skipped.push({ what: 'measurement times', count: noTime, why: 'Old Aven kept only the day: they are set to noon (nothing skipped).' });
  for (const [what, count] of damaged) skip(`damaged ${what}`, count, 'Missing or broken fields in old Aven\'s data; left out rather than guessed.');
  return { records: out, skipped };
}

/** The dry run: what would come over, compared with what is already in Aven 2. Writes nothing. */
export function dryRun(e: Engine, mapped: Mapped): Report {
  const add: AnyRecord[] = [];
  let already = 0, deletedHere = 0;
  for (const r of mapped.records) {
    const cur = e.get(r.id);
    if (!cur) add.push(r);
    else if (cur.deleted) deletedHere++;
    else already++;
  }
  const found = countKinds(mapped.records);
  return { found, summary: summarise(found), toAdd: add.length, already, deletedHere, skipped: mapped.skipped, add };
}

/** Write the import as one action (one Undo), after a last-known-good copy. Records that appeared meanwhile are left alone. */
export async function runImport(e: Engine, report: Report, actionId = newId('i')): Promise<Result> {
  const ops: Op[] = report.add.filter((r) => !e.get(r.id)).map((record) => ({ op: 'put', record }));
  if (!ops.length) return { status: 'noop' };
  await e.snapshot('before importing from old Aven');
  return e.commit({ id: actionId, type: 'import.oldAven', label: `Imported from old Aven: ${summarise(countKinds(ops.map((x) => (x as { record: AnyRecord }).record)))}`, source: 'import', ops });
}
