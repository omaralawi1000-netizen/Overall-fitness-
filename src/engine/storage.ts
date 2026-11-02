/**
 * Keeping the data on the phone. Ported from old Aven's persist.ts: ask once for persistent storage when there is real
 * data (Chrome answers by itself and grants it to installed apps; no prompt). The answer is kept in the engine's meta.
 */
import type { Engine } from './engine';

/** true: kept; false: the browser may clear it under pressure; null: this browser can't say. */
export async function keepStorage(nav: Pick<Navigator, 'storage'> | undefined = globalThis.navigator): Promise<boolean | null> {
  try {
    if (!nav?.storage?.persist) return null;
    if (await nav.storage.persisted()) return true;
    return await nav.storage.persist();
  } catch { return null; }
}

/** Ask once there is something worth keeping; remember the answer. */
export async function keepWhenUseful(e: Engine, nav?: Pick<Navigator, 'storage'>): Promise<boolean | null> {
  if (!e.allRecords().some((r) => !r.deleted)) return null;
  const kept = await keepStorage(nav);
  await e.setMeta('persisted', kept);
  return kept;
}

/** How full the site's storage is, when the browser says. */
export async function usage(nav: Pick<Navigator, 'storage'> | undefined = globalThis.navigator): Promise<{ used: number; quota: number } | null> {
  try { const u = await nav?.storage?.estimate?.(); return u && u.quota ? { used: u.usage ?? 0, quota: u.quota } : null; } catch { return null; }
}
