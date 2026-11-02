/**
 * Derived things (a summary, a Coach notice) and when they are out of date.
 *
 * Staleness is never stored: a derived record keeps `builtFrom`, the revision of each fact at the moment it was built,
 * and it is stale whenever any of those facts now has another revision, is deleted or gone, or is itself stale. Every
 * write (also an Undo, a restore or an import) raises a record's revision, so no sequence of changes and Undos can
 * make an old value look fresh: only building it again (`buildOn` with the facts as they are now) does.
 */
import type { AnyRecord } from './model';

type Get = (id: string) => AnyRecord | undefined;

/** The `builtFrom` for something built now from these facts. Every fact must exist. */
export function buildOn(get: Get, factIds: string[]): { builtFrom: Record<string, number> } {
  const builtFrom: Record<string, number> = {};
  for (const id of factIds) {
    const f = get(id);
    if (!f) throw new Error(`${id} doesn't exist`);
    builtFrom[id] = f.rev;
  }
  return { builtFrom };
}

/** Is this record out of date? Records that aren't derived never are. Follows chains (a notice built on a summary). */
export function isStale(r: AnyRecord, get: Get, seen = new Set<string>()): boolean {
  if (!r.builtFrom) return false;
  if (seen.has(r.id)) return true; // a loop can't be trusted
  seen.add(r.id);
  for (const [id, rev] of Object.entries(r.builtFrom)) {
    const f = get(id);
    if (!f || f.deleted || f.rev !== rev || isStale(f, get, seen)) return true;
  }
  return false;
}
