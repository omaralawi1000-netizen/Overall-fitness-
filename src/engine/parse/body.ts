/**
 * Water and bodyweight, said out loud: "500 ml water", "two glasses of water", "I weigh 82,5", "vægt 180 lb".
 * Both need their own word (water/vand; weigh/weight/vejer/vægt): a bare number is a set, not a weight. A number that
 * cannot be a body (12 kg, 900 kg) or a drink (9 litres) is asked about, never logged.
 */
import { displayToKg } from '../units';
import { NUMBER_WORDS } from './words';

export interface WaterRead { ml: number; /** how a "glass" or "bottle" was counted, when it was */ assumed?: string }
export interface BodyweightRead { kg: number; entered?: { value: number; unit: 'lb' }; /** no unit was said: kilos assumed */ assumedUnit?: boolean }
export type BodyRead<T> = T | { ask: 'range'; value: number; unit: string } | null;

export const GLASS_ML = 250;
export const BOTTLE_ML = 500;

const WATER_WORD = '(?:water|vand)';
const FILLER = /\b(?:i|jeg|just|lige|had|drank|drink|drikker|har|drukket|log|add|tilføj|tilfoej|please|some|noget|lidt|of|af|med|with|a bit of)\b/g;

function clean(text: string): string {
  let s = ` ${text.toLowerCase()} `.replace(/(\d),(\d)/g, '$1.$2').replace(/[!?;:,"“”]/g, ' ').replace(/\.(?!\d)/g, ' ');
  s = s.replace(/[a-zæøå]+/g, (w) => (w in NUMBER_WORDS && w !== 'en' && w !== 'et' ? String(NUMBER_WORDS[w]) : w));
  return s;
}

/** "500 ml water", "1.5 l water", "2 dl vand", "a glass of water", "two bottles of water". Null when it isn't one. */
export function readWater(text: string): BodyRead<WaterRead> {
  const s = clean(text).replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
  let m = s.match(new RegExp(`^(\\d+(?:\\.\\d+)?) ?(ml|cl|dl|l|liter|litre|liters|litres) ${WATER_WORD}$`));
  if (m) {
    const f = { ml: 1, cl: 10, dl: 100 }[m[2] as 'ml'] ?? 1000;
    return water(Number(m[1]) * f);
  }
  m = s.match(new RegExp(`^(?:(\\d+(?:\\.\\d+)?|a|an|en|et|half|halv) )?(glass|glasses|glas|bottle|bottles|flaske|flasker) ${WATER_WORD}$`));
  if (m) {
    const k = m[1] === undefined || /^(a|an|en|et)$/.test(m[1]) ? 1 : /^(half|halv)$/.test(m[1]) ? 0.5 : Number(m[1]);
    const bottle = /^(bottle|flaske)/.test(m[2]);
    return water(k * (bottle ? BOTTLE_ML : GLASS_ML), `${bottle ? 'a bottle' : 'a glass'} counted as ${bottle ? BOTTLE_ML : GLASS_ML} ml`);
  }
  return null;
}
function water(ml: number, assumed?: string): BodyRead<WaterRead> {
  const v = Math.round(ml * 100) / 100;
  if (!(v >= 10 && v <= 5000)) return { ask: 'range', value: v, unit: 'ml' };
  return { ml: v, ...(assumed ? { assumed } : {}) };
}

const WEIGHT_CUE = '(?:(?:(?:i|jeg) )?(?:weigh|weighed|weigh in at|vejer|vejede)|(?:my )?(?:body ?weight|morning weight|weight|kropsvaegt|vaegt|min vaegt|morgenvaegt))(?: is| was| er| var| at)?';

/** "I weigh 82.5", "bodyweight 180 lb", "vægt 82,5 kg". Null when no weight word was said. */
export function readBodyweight(text: string): BodyRead<BodyweightRead> {
  const s = clean(text).replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/\b(?:today|i dag|idag|this morning|i morges|just|lige)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const m = s.match(new RegExp(`^${WEIGHT_CUE} (\\d+(?:\\.\\d+)?) ?(kg|kilos?|kilograms?|lbs?|pounds?)?$`));
  if (!m) return null;
  const v = Number(m[1]);
  const lb = !!m[2] && /^(lb|pound)/.test(m[2]);
  const kg = Math.round((lb ? displayToKg(v, 'lb') : v) * 100) / 100;
  if (!(kg >= 30 && kg <= 300)) return { ask: 'range', value: v, unit: lb ? 'lb' : 'kg' };
  return { kg, ...(lb ? { entered: { value: v, unit: 'lb' as const } } : {}), ...(m[2] ? {} : { assumedUnit: true }) };
}
