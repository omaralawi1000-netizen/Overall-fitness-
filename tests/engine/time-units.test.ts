import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { addDays, dayKeyAt, diffDays, fmtDurationLong, isDayKey, startOfWeek } from '../../src/engine/time';
import { displayToKg, kgToDisplay, parseNum } from '../../src/engine/units';

const CPH = 'Europe/Copenhagen';
const at = (iso: string) => Date.parse(iso);

describe('dates & units (ported from old Aven core.test.ts)', () => {
  it('day start hour shifts late-night logging back a day', () => {
    const t = at('2026-05-12T02:30:00+02:00'); // 02:30 in Copenhagen
    expect(dayKeyAt(t, CPH, 0)).toBe('2026-05-12');
    expect(dayKeyAt(t, CPH, 4)).toBe('2026-05-11');
  });
  it('addDays across DST and month ends', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
  });
  it('week starts', () => {
    expect(startOfWeek('2026-05-13', 1)).toBe('2026-05-11');
    expect(startOfWeek('2026-05-13', 0)).toBe('2026-05-10');
  });
  it('parseNum accepts both decimal separators', () => {
    expect(parseNum('1,5')).toBe(1.5); expect(parseNum('82.25')).toBe(82.25); expect(parseNum(' 7 ')).toBe(7);
    expect(parseNum('1.000')).toBe(1000); expect(parseNum('abc')).toBeUndefined(); expect(parseNum('')).toBeUndefined();
  });
  it('kg/lb roundtrip', () => { expect(displayToKg(kgToDisplay(61.235, 'lb'), 'lb')).toBeCloseTo(61.235, 8); });
  it('session lengths read as words, not a clock', () => {
    expect(fmtDurationLong(17)).toBe('17 s');
    expect(fmtDurationLong(55 * 60)).toBe('55 min');
    expect(fmtDurationLong(63 * 60)).toBe('1 h 3 min');
    expect(fmtDurationLong(63 * 60, 'da')).toBe('1 t 3 min');
  });
});

describe('time zones and the day boundary (new)', () => {
  it('a 01:30 snack with a 04:00 day start belongs to yesterday', () => {
    expect(dayKeyAt(at('2026-11-03T01:30:00+01:00'), CPH, 4)).toBe('2026-11-02');
    expect(dayKeyAt(at('2026-11-03T04:00:00+01:00'), CPH, 4)).toBe('2026-11-03');
  });
  it('the day comes from the record’s own time zone, not the phone’s now', () => {
    const t = at('2026-11-02T23:30:00Z'); // 00:30 in Copenhagen, 18:30 in New York
    expect(dayKeyAt(t, CPH)).toBe('2026-11-03');
    expect(dayKeyAt(t, 'America/New_York')).toBe('2026-11-02');
  });
  it('the night the clocks go back still uses the local hour', () => {
    // 25 Oct 2026: 03:00 CEST becomes 02:00 CET. 02:30 happens twice; both are before a 04:00 start.
    expect(dayKeyAt(at('2026-10-25T02:30:00+02:00'), CPH, 4)).toBe('2026-10-24');
    expect(dayKeyAt(at('2026-10-25T02:30:00+01:00'), CPH, 4)).toBe('2026-10-24');
    expect(dayKeyAt(at('2026-10-25T04:10:00+01:00'), CPH, 4)).toBe('2026-10-25');
  });
  it('property: addDays and diffDays agree, and day keys stay real days', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 20000 }), fc.integer({ min: -800, max: 800 }), (base, n) => {
      const k = addDays('2000-01-01', base);
      const k2 = addDays(k, n);
      return isDayKey(k2) && diffDays(k2, k) === n && addDays(k2, -n) === k;
    }));
  });
  it('property: every moment maps to a real day, at most one day before the calendar day', () => {
    fc.assert(fc.property(fc.integer({ min: 946684800000, max: 4102444800000 }), fc.integer({ min: 0, max: 6 }), fc.constantFrom(CPH, 'UTC', 'Asia/Tokyo', 'America/Los_Angeles'), (t, h, tz) => {
      const plain = dayKeyAt(t, tz, 0), shifted = dayKeyAt(t, tz, h);
      return isDayKey(shifted) && [0, -1].includes(diffDays(shifted, plain));
    }));
  });
  it('property: kg ↔ lb round trips', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1000, noNaN: true }), (kg) => Math.abs(displayToKg(kgToDisplay(kg, 'lb'), 'lb') - kg) < 1e-9));
  });
  it('property: parseNum reads any number written with a comma or a point', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 999 }), fc.integer({ min: 0, max: 99 }), fc.constantFrom(',', '.'), (a, b, sep) => {
      const s = `${a}${sep}${String(b).padStart(2, '0')}`;
      return parseNum(s) === Number(`${a}.${String(b).padStart(2, '0')}`);
    }));
  });
});
