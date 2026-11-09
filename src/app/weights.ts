// The manual weight log: one weight per day, kept on the phone (localStorage key `a2:weights`), never sent anywhere.
export interface Weigh { d: string; kg: number } // d = the local day, YYYY-MM-DD

export const MIN_KG = 20, MAX_KG = 400, KEEP = 730;

/** What was stored, made safe: bad rows dropped, one row per day (the last one wins), oldest first. */
export function parseWeights(raw: string | null): Weigh[] {
  let a: unknown;
  try { a = raw ? JSON.parse(raw) : []; } catch { return []; }
  if (!Array.isArray(a)) return [];
  const by = new Map<string, number>();
  for (const x of a) {
    const r = x as { d?: unknown; kg?: unknown };
    if (typeof r?.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.d) && typeof r.kg === 'number' && r.kg >= MIN_KG && r.kg <= MAX_KG) by.set(r.d, Math.round(r.kg * 10) / 10);
  }
  return [...by].map(([d, kg]) => ({ d, kg })).sort((p, q) => (p.d < q.d ? -1 : 1)).slice(-KEEP);
}

/** Today's weigh-in replaces the one already there. Returns the new list, or null when the number is not a real weight. */
export function putWeight(list: Weigh[], day: string, kg: number): Weigh[] | null {
  if (!Number.isFinite(kg) || kg < MIN_KG || kg > MAX_KG) return null;
  const k = Math.round(kg * 10) / 10;
  return [...list.filter((w) => w.d !== day), { d: day, kg: k }].sort((p, q) => (p.d < q.d ? -1 : 1)).slice(-KEEP);
}

export const dayNum = (d: string) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);

/** The change over the last 7 days up to the newest weigh-in (needs two weigh-ins inside that week), else null. */
export function weekChange(list: Weigh[]): number | null {
  const last = list[list.length - 1];
  if (!last) return null;
  const first = list.find((w) => dayNum(last.d) - dayNum(w.d) <= 7 && w !== last);
  return first ? Math.round((last.kg - first.kg) * 10) / 10 : null;
}

/** The newest `n` weigh-ins for the chart, oldest first. */
export const recent = (list: Weigh[], n = 14) => list.slice(-n);
