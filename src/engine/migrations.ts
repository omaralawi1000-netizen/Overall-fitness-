/**
 * Schema migrations: plain functions from version n to n+1. No clock and no randomness, so running one twice gives the
 * same record (tests check this). The engine saves a last-known-good copy before running any (engine.ts `migrate`).
 *
 * Schema 1 is the first; there is nothing to migrate yet. A new schema adds one entry here, a test, and raises SCHEMA.
 */
export type Migration = { from: number; to: number; migrate: (r: Record<string, unknown>) => Record<string, unknown> };

export const MIGRATIONS: Migration[] = [];

/** One record brought from `from` up to the newest version the list reaches. */
export function migrateRecord<T extends Record<string, unknown>>(r: T, from: number, list: Migration[] = MIGRATIONS): T {
  let cur: Record<string, unknown> = structuredClone(r);
  let v = typeof cur.v === 'number' ? Math.max(cur.v, from) : from;
  for (;;) {
    const m = list.find((x) => x.from === v);
    if (!m) break;
    cur = { ...m.migrate(cur), v: m.to };
    v = m.to;
  }
  return cur as T;
}
