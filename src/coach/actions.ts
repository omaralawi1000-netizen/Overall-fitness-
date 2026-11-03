/**
 * What the Coach can change, and how (docs/COACH.md §3, Answer Bar rule 7). The AI only PROPOSES an action. Code then:
 * 1. validates the parameters (types, ranges, hard safety limits),
 * 2. checks the current state (the record exists, the value really changes),
 * 3. applies it through the engine's action log (one action, Undo-able),
 * 4. verifies it by reading the record back.
 * Only a verified result becomes a "Did in the app" line. A proposal that is consequential (a target, forgetting a card)
 * is shown as a preview first unless the person gave a direct command.
 *
 * This is the first slice of the action catalog: targets, memory, water and weight. More actions join one by one,
 * each with the same four steps and its own tests.
 */
import type { Engine } from '../engine/engine';
import type { AnyRecord, MemoryCard, MemoryTopic, Settings } from '../engine/model';
import type { NewRecord, Op } from '../engine/plan';
import { dayKeyAt } from '../engine/time';
import { newId } from '../engine/util';

export type TargetKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'waterMl';
const TARGET_UNIT: Record<TargetKey, string> = { kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g', fibre: 'g', waterMl: 'ml' };
/** sane ranges; kcal below 1,200 is never set by the Coach (Answer Bar rule 11: very low intake gets care, not a plan) */
const TARGET_RANGE: Record<TargetKey, [number, number]> = { kcal: [1200, 6000], protein: [20, 400], carbs: [20, 900], fat: [20, 300], fibre: [5, 100], waterMl: [500, 6000] };
const TOPICS: readonly MemoryTopic[] = ['about', 'goal', 'promise', 'preference', 'health', 'life'];

export type Proposal =
  | { name: 'set_target'; key: TargetKey; value: number }
  | { name: 'remember'; text: string; topic: MemoryTopic; until?: string }
  | { name: 'forget'; memoryId: string }
  | { name: 'log_water'; ml: number }
  | { name: 'log_weight'; kg: number };

/** how the person asked: a direct command is done at once; a Coach suggestion arrives as a preview */
export type Mode = 'command' | 'proposal';

export type Checked =
  | { ok: true; proposal: Proposal; mode: Mode; preview: boolean; label: string; ops: Op[] }
  | { ok: false; reason: string };

export interface Did { actionId: string; label: string; undo: true }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= max ? v.trim() : null;
const fmt = (n: number) => n.toLocaleString('en-GB');

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
    default:
      return { error: `unknown action ${String(o.name)}` };
  }
}

/** Steps 1 and 2: validate and check against the current state. Pure: nothing is written here. */
export function check(p: Proposal, mode: Mode, o: { records: AnyRecord[]; now: number; tz: string }): Checked {
  const settings = o.records.find((r): r is Settings => r.kind === 'settings' && !r.deleted);
  const day = dayKeyAt(o.now, o.tz, settings?.dayStartHour ?? 0);
  const ok = (preview: boolean, label: string, ops: Op[]): Checked => ({ ok: true, proposal: p, mode, preview, label, ops });
  switch (p.name) {
    case 'set_target': {
      const [lo, hi] = TARGET_RANGE[p.key];
      if (p.value < lo || p.value > hi) return { ok: false, reason: `${p.key} target ${p.value} is outside ${lo}–${hi}` };
      const before = settings?.targets[p.key];
      if (before === p.value) return { ok: false, reason: `${p.key} target is already ${p.value}` };
      const unit = TARGET_UNIT[p.key];
      const label = `${p.key === 'waterMl' ? 'water' : p.key} target ${before !== undefined ? `${fmt(before)} → ` : ''}${fmt(p.value)} ${unit}`;
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
      return ok(mode === 'proposal', `remembered "${p.text}"`, [{ op: 'create', record }]);
    }
    case 'forget': {
      const m = o.records.find((r): r is MemoryCard => r.id === p.memoryId && r.kind === 'memory');
      if (!m || m.deleted) return { ok: false, reason: 'no such memory' };
      return ok(mode === 'proposal', `forgot "${m.text}"`, [{ op: 'delete', id: m.id }]);
    }
    case 'log_water':
      if (p.ml < 50 || p.ml > 3000) return { ok: false, reason: `${p.ml} ml is outside 50–3,000` };
      return ok(false, `logged ${fmt(p.ml)} ml water`, [{ op: 'create', record: { id: newId('w'), kind: 'water', day, ml: p.ml } as NewRecord }]);
    case 'log_weight':
      if (p.kg < 30 || p.kg > 300) return { ok: false, reason: `${p.kg} kg is outside 30–300` };
      return ok(false, `logged ${p.kg} kg`, [{ op: 'create', record: { id: newId('bw'), kind: 'bodyweight', day, kg: p.kg } as NewRecord }]);
  }
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
  const there = a.changes.every((ch) => { const r = e.get(ch.id); return !!r && !!r.deleted === !!ch.after.deleted; });
  return there ? { did: { actionId, label: a.label, undo: true } } : { failed: 'the change is not there any more' };
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
