/**
 * Derived things (a summary, a Coach notice) and when they are out of date.
 *
 * Staleness is never stored. A derived record keeps `builtFrom`: the stamp of each fact at the moment it was built. A
 * stamp names the write that made a fact's state (the action id), so it is unique across phones, Undo always makes a
 * new one, and a copy from a backup keeps the stamp of the state it copies. A derived record is stale whenever any of
 * its facts now has another stamp, is deleted or gone, or is itself stale. So no sequence of changes, Undos, restores
 * or imports can make an old value look fresh: only building it again (`buildOn`, from the facts as they are now) does.
 */
import type { AnyRecord } from './model';

type Get = (id: string) => AnyRecord | undefined;

/** The `builtFrom` for something built now from these facts. Every fact must exist and carry a stamp. */
export function buildOn(get: Get, factIds: string[]): { builtFrom: Record<string, string> } {
  const builtFrom: Record<string, string> = {};
  for (const id of factIds) {
    const f = get(id);
    if (!f?.stamp) throw new Error(`${id} doesn't exist`);
    builtFrom[id] = f.stamp;
  }
  return { builtFrom };
}

/** Is this record out of date? Records that aren't derived never are. Follows chains (a notice built on a summary). */
export function isStale(r: AnyRecord, get: Get): boolean {
  const done = new Map<string, boolean>(); // records already worked out (a shared ancestor is checked once)
  const path = new Set<string>(); // the chain being followed now: meeting one of these again is a loop
  const walk = (x: AnyRecord): boolean => {
    const legacy = x as AnyRecord & { basedOn?: unknown; stale?: unknown };
    if (!x.builtFrom) return legacy.basedOn !== undefined || legacy.stale === true; // an older derived shape: rebuild it
    if (done.has(x.id)) return done.get(x.id)!;
    if (path.has(x.id)) return true; // a loop can't be trusted
    path.add(x.id);
    let out = false;
    for (const [id, stamp] of Object.entries(x.builtFrom)) {
      const f = get(id);
      if (!f || f.deleted || f.stamp !== stamp || walk(f)) { out = true; break; }
    }
    path.delete(x.id);
    done.set(x.id, out);
    return out;
  };
  return walk(r);
}
