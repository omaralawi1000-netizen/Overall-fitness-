/**
 * Days and time zones. Ported from old Aven's dates.ts and derive.ts (day keys, a custom day start, add/diff days, week
 * starts), made time-zone aware: a record's day is worked out from its own moment (`at`, ms UTC) and the phone's time zone
 * at that moment, so it stays the same wherever the phone travels later.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** The phone's time zone right now ("Europe/Copenhagen"); UTC when the browser can't say. */
export function deviceTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

const PARTS = new Map<string, Intl.DateTimeFormat>();
/** The wall clock in `tz` at moment `ms`: year, month (1–12), day, hour (0–23), minute. */
export function wallClock(ms: number, tz: string): { y: number; m: number; d: number; h: number; min: number } {
  let f = PARTS.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    PARTS.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, min: p.minute };
}

/**
 * The day (YYYY-MM-DD) a moment belongs to, honouring the person's day start: with a 04:00 start, 01:30 is still
 * yesterday. The local hour is compared (not "four hours earlier"), so a night that crosses a clock change is still right.
 */
export function dayKeyAt(ms: number, tz: string, dayStartHour = 0): string {
  const w = wallClock(ms, tz);
  const key = `${w.y}-${pad(w.m)}-${pad(w.d)}`;
  return dayStartHour > 0 && w.h < dayStartHour ? addDays(key, -1) : key;
}

/** Is this a real calendar day written as YYYY-MM-DD? */
export function isDayKey(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Calendar maths on day keys runs in UTC, where there are no clock changes, so adding days can never skip or repeat one.
const toUtc = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUtc = (t: number) => { const x = new Date(t); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; };

export function addDays(key: string, n: number): string { return fromUtc(toUtc(key) + n * 86400000); }
export function diffDays(a: string, b: string): number { return Math.round((toUtc(a) - toUtc(b)) / 86400000); }
/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(key: string): number { return new Date(toUtc(key)).getUTCDay(); }
export function startOfWeek(key: string, weekStart: 0 | 1): string { return addDays(key, -((weekdayOf(key) - weekStart + 7) % 7)); }

/** How long something took, in words: "48 min", "1 h 5 min" ("1 t 5 min" in Danish); under a minute, the seconds. */
export function fmtDurationLong(totalSec: number, lang: 'en' | 'da' = 'en'): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} ${lang === 'da' ? 't' : 'h'}${m % 60 ? ` ${m % 60} min` : ''}`;
}
/** A clock for timers: "1:05", "1:02:03". */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
