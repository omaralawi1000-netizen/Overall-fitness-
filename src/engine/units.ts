/**
 * Units. Ported from old Aven's units.ts. Aven 2 stores every number in one fixed unit (kg, g, ml, kcal, s, m, cm); these
 * convert what someone typed or wants to see. `parseNum` reads "82,5" and "82.5" alike.
 */
export const KG_PER_LB = 0.45359237;
export const M_PER_MI = 1609.344;
export const CM_PER_IN = 2.54;

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type LengthUnit = 'cm' | 'in';

export const kgToDisplay = (kg: number, u: WeightUnit) => (u === 'lb' ? kg / KG_PER_LB : kg);
export const displayToKg = (v: number, u: WeightUnit) => (u === 'lb' ? v * KG_PER_LB : v);
export const mToDisplay = (m: number, u: DistanceUnit) => (u === 'mi' ? m / M_PER_MI : m / 1000);
export const displayToM = (v: number, u: DistanceUnit) => (u === 'mi' ? v * M_PER_MI : v * 1000);
export const cmToDisplay = (cm: number, u: LengthUnit) => (u === 'in' ? cm / CM_PER_IN : cm);
export const displayToCm = (v: number, u: LengthUnit) => (u === 'in' ? v * CM_PER_IN : v);

/**
 * Typed decimals: "1,5", "1.5", " 82,25 ". Undefined for blanks and junk. A lone thousands separator ("1.000", "1,000")
 * with exactly three digits after it reads as thousands; one or two digits after it read as decimals.
 */
export function parseNum(input: string | number | undefined | null): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  let s = input.trim().replace(/\s/g, '');
  if (!s) return undefined;
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(',', '.');
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const NUM_FMT = new Map<string, Intl.NumberFormat>();
/** A number the way the language writes it, at most `max` decimals. */
export function fmtNum(v: number, lang: 'en' | 'da', max = 1): string {
  if (!Number.isFinite(v)) return '–';
  const key = `${lang}|${max}|${Math.abs(v) >= 1000}`;
  let f = NUM_FMT.get(key);
  if (!f) { f = new Intl.NumberFormat(lang === 'da' ? 'da-DK' : 'en-GB', { maximumFractionDigits: max, useGrouping: Math.abs(v) >= 1000 }); NUM_FMT.set(key, f); }
  return f.format(v);
}
