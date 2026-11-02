/**
 * Backup and restore (DATA-MODEL.md §7).
 *
 * - Export: one versioned file with a checksum (SHA-256 over the content), so a damaged or cut-off file is caught before
 *   anything is touched.
 * - Restore: a preview first ("found 214 workouts, 1,302 foods"), then merge or replace. Either is ONE action (one
 *   transaction, one Undo), after a last-known-good copy. A wrong, newer, damaged or half file changes nothing.
 */
import type { Engine, Result } from './engine';
import { SCHEMA, type Action, type AnyRecord, type Kind } from './model';
import { checkRecord, type Op } from './plan';
import { canonicalJson, deepEqual, newId, sha256 } from './util';

export interface BackupFile {
  app: 'a2-backup';
  format: 1;
  schema: number;
  exportedAt: string;
  counts: Partial<Record<Kind, number>>;
  records: AnyRecord[];
  actions: Action[];
  checksum: string;
}

const checksumOf = (b: Pick<BackupFile, 'schema' | 'records' | 'actions'>) => sha256(canonicalJson({ schema: b.schema, records: b.records, actions: b.actions }));

export function countKinds(records: AnyRecord[], liveOnly = true): Partial<Record<Kind, number>> {
  const out: Partial<Record<Kind, number>> = {};
  for (const r of records) if (!liveOnly || !r.deleted) out[r.kind] = (out[r.kind] ?? 0) + 1;
  return out;
}

export async function exportBackup(e: Engine, now = new Date()): Promise<BackupFile> {
  const records = e.allRecords();
  const actions = await e.allActions();
  return { app: 'a2-backup', format: 1, schema: SCHEMA, exportedAt: now.toISOString(), counts: countKinds(records), records, actions, checksum: await checksumOf({ schema: SCHEMA, records, actions }) };
}

/** The file name a backup is saved under. */
export const backupName = (now = new Date()) => `aven2-backup-${now.toISOString().slice(0, 10)}.json`;

export type ParseProblem = 'notJson' | 'oldAven' | 'notBackup' | 'newer' | 'checksum' | 'records';
export type Parsed = { ok: true; backup: BackupFile } | { ok: false; problem: ParseProblem; detail: string };

/** A file's text → a checked backup, or what is wrong with it. Nothing is written here. */
export async function parseBackup(text: string): Promise<Parsed> {
  let j: unknown;
  try { j = JSON.parse(text); } catch { return { ok: false, problem: 'notJson', detail: 'The file is damaged or cut off (it is not complete JSON).' }; }
  const o = j as Omit<Partial<BackupFile>, 'app'> & { app?: string; data?: unknown };
  if (o?.app === 'aven' && o.data) return { ok: false, problem: 'oldAven', detail: 'This is an old Aven backup. Use "Import from old Aven" instead.' };
  if (o?.app !== 'a2-backup' || o.format !== 1 || !Array.isArray(o.records) || !Array.isArray(o.actions) || typeof o.schema !== 'number' || typeof o.checksum !== 'string') {
    return { ok: false, problem: 'notBackup', detail: 'This is not an Aven 2 backup.' };
  }
  if (o.schema > SCHEMA) return { ok: false, problem: 'newer', detail: 'This backup was made by a newer Aven 2. Update the app first.' };
  if ((await checksumOf(o as BackupFile)) !== o.checksum) return { ok: false, problem: 'checksum', detail: 'The file was changed or damaged after it was saved (its checksum doesn\'t match).' };
  const seen = new Set<string>();
  for (const r of o.records) {
    const bad = checkRecord(r);
    if (bad) return { ok: false, problem: 'records', detail: `A record in the file is broken: ${bad}.` };
    if (seen.has(r.id)) return { ok: false, problem: 'records', detail: `The record ${r.id} is in the file twice.` };
    seen.add(r.id);
  }
  return { ok: true, backup: o as BackupFile };
}

export interface Preview {
  /** what the file holds, live records only, by kind */
  found: Partial<Record<Kind, number>>;
  /** in plain words, the big ones first: "214 workouts, 1,302 foods" */
  summary: string;
  /** compared with this phone */
  newHere: number;
  same: number;
  newerInFile: number;
  newerOnPhone: number;
  /** deleted on this phone but live in the file: merge keeps them deleted */
  deletedOnPhone: number;
  /** on this phone but not in the file: replace deletes them (softly, with Undo) */
  onlyOnPhone: number;
  exportedAt: string;
}

const WORDS: Partial<Record<Kind, [string, string]>> = {
  session: ['workout', 'workouts'], set: ['set', 'sets'], food: ['food', 'foods'], water: ['water', 'waters'], bodyweight: ['weigh-in', 'weigh-ins'],
  activity: ['activity', 'activities'], memory: ['memory card', 'memory cards'], routine: ['routine', 'routines'], healthDay: ['health day', 'health days'],
  measurement: ['measurement', 'measurements'], sleep: ['night', 'nights'], exercise: ['custom exercise', 'custom exercises'],
};
export function summarise(counts: Partial<Record<Kind, number>>): string {
  const order: Kind[] = ['session', 'set', 'food', 'water', 'bodyweight', 'activity', 'routine', 'exercise', 'memory', 'measurement', 'healthDay', 'sleep'];
  const parts = order.filter((k) => counts[k]).map((k) => `${counts[k]!.toLocaleString('en-GB')} ${WORDS[k]![counts[k] === 1 ? 0 : 1]}`);
  return parts.length ? parts.join(', ') : 'nothing';
}

const same = (a: AnyRecord, b: AnyRecord) => deepEqual({ ...a, rev: 0 }, { ...b, rev: 0 });

export function previewRestore(e: Engine, b: BackupFile): Preview {
  const p: Preview = { found: countKinds(b.records), summary: summarise(countKinds(b.records)), newHere: 0, same: 0, newerInFile: 0, newerOnPhone: 0, deletedOnPhone: 0, onlyOnPhone: 0, exportedAt: b.exportedAt };
  const inFile = new Set<string>();
  for (const r of b.records) {
    inFile.add(r.id);
    const cur = e.get(r.id);
    if (!cur) p.newHere++;
    else if (same(cur, r)) p.same++;
    else if (cur.deleted && !r.deleted) p.deletedOnPhone++;
    else if (r.updatedAt > cur.updatedAt) p.newerInFile++;
    else p.newerOnPhone++;
  }
  for (const r of e.allRecords()) if (!inFile.has(r.id) && !r.deleted) p.onlyOnPhone++;
  return p;
}

/** The operations a restore would write. Merge: new ones in, the newer side wins, phone deletes stay. Replace: the phone becomes the file. */
export function restoreOps(e: Engine, b: BackupFile, mode: 'merge' | 'replace'): Op[] {
  const ops: Op[] = [];
  const inFile = new Set<string>();
  for (const r of b.records) {
    inFile.add(r.id);
    const cur = e.get(r.id);
    if (!cur) { ops.push({ op: 'put', record: r }); continue; }
    if (same(cur, r)) continue;
    if (mode === 'replace') { ops.push({ op: 'put', record: r }); continue; }
    if (cur.deleted && !r.deleted) continue;
    if (r.updatedAt > cur.updatedAt) ops.push({ op: 'put', record: r });
  }
  if (mode === 'replace') for (const r of e.allRecords()) if (!inFile.has(r.id) && !r.deleted) ops.push({ op: 'delete', id: r.id });
  return ops;
}

/** Restore as one action, after a last-known-good copy. Returns the engine's result (one Undo takes it all back). */
export async function restore(e: Engine, b: BackupFile, mode: 'merge' | 'replace', actionId = newId('r')): Promise<Result> {
  const ops = restoreOps(e, b, mode);
  if (!ops.length) return { status: 'noop' };
  await e.snapshot(`before restoring a backup from ${b.exportedAt} (${mode})`);
  return e.commit({ id: actionId, type: `restore.${mode}`, label: `Restored a backup from ${b.exportedAt.slice(0, 10)} (${mode === 'merge' ? 'merged' : 'replaced'}): ${summarise(countKinds(b.records))}`, source: 'import', ops });
}

