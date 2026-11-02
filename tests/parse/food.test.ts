// Food words and water/bodyweight. Ported from old Aven's dictation and quantity tests.
import { describe, it, expect } from 'vitest';
import { parseFood, rowQuantity, placeholderPortion, readWater, readBodyweight, type FoodShape } from '../../src/engine/parse';

const rows = (t: string) => parseFood(t).rows.map((r) => [r.amount, r.dim, r.query]);

describe('food rows', () => {
  it('amounts, units and names, English and Danish', () => {
    expect(rows('200 grams of skyr, one banana and 60 grams of oats')).toEqual([[200, 'g', 'skyr'], [1, 'count', 'banana'], [60, 'g', 'oats']]);
    const r = parseFood('1,5 dl mælk og 2 skiver rugbrød').rows;
    expect(r[0]).toMatchObject({ amount: 150, dim: 'ml', query: 'mælk' });
    expect(r[1]).toMatchObject({ amount: 2, dim: 'count', countWord: 'slice', query: 'rugbrød' });
    expect(rows('200g skyr')).toEqual([[200, 'g', 'skyr']]);
    expect(rows('half a banana')).toEqual([[0.5, 'count', 'banana']]);
    expect(rows('2 tbsp peanut butter')).toEqual([[30, 'ml', 'peanut butter']]);
    expect(parseFood('en håndfuld nødder').rows[0]).toMatchObject({ dim: 'count', countWord: 'handful' });
    expect(parseFood('1 dåse tun').rows[0]).toMatchObject({ dim: 'count', countWord: 'can' });
  });
  it('a piece it cannot read is handed back, not dropped or guessed', () => {
    const r = parseFood('200 grams skyr and some stuff');
    expect(r.rows).toHaveLength(1);
    expect(r.unread).toEqual(['some stuff']);
  });
  it('no amount, no row', () => {
    expect(parseFood('banana').rows).toEqual([]);
    expect(parseFood('0 grams of skyr').rows).toEqual([]);
  });
  it('"a" alone is marked weak', () => {
    expect(parseFood('a banana').rows[0].weak).toBe(true);
    expect(parseFood('a slice of bread').rows[0].weak).toBeUndefined();
    expect(parseFood('one banana').rows[0].weak).toBeUndefined();
  });
});

const skyr: FoodShape = { name: 'Skyr', basis: 'g', portions: [] };
const oats: FoodShape = { name: 'Havregryn', basis: 'g', portions: [] };
const corn: FoodShape = { name: 'Corn cakes', basis: 'g', portions: [{ id: 'p1', label: 'serving (100 g)', amount: 100 }] };
const cake: FoodShape = { name: 'Rice cake', basis: 'g', portions: [{ id: 'p2', label: '1 cake (8 g)', amount: 8, verified: true }] };
const mystery: FoodShape = { name: 'Mystery', basis: 'g', portions: [] };

describe('a row against a food', () => {
  const one = (t: string) => parseFood(t).rows[0];
  it('grams on a gram food are exact', () => {
    expect(rowQuantity(one('200 grams of skyr'), skyr)).toEqual({ qty: { amount: 200, unit: 'g' }, estimated: false });
  });
  it('a volume on a gram food is worked out from how heavy it is, and flagged as an estimate', () => {
    const q = rowQuantity(one('2 dl skyr'), skyr);
    expect(q.qty).toEqual({ amount: 206, unit: 'g' });
    expect(q.estimated).toBe(true);
    expect(rowQuantity(one('1 dl havregryn'), oats).qty).toEqual({ amount: 40, unit: 'g' });
  });
  it('an unknown food by volume needs grams', () => {
    expect(rowQuantity(one('2 dl mystery'), mystery)).toEqual({ qty: null, estimated: false, problem: 'needsGrams' });
  });
  it('a database stand-in "serving (100 g)" is not a corn cake', () => {
    expect(placeholderPortion(corn.portions[0], 'g')).toBe(true);
    expect(rowQuantity(one('10 corn cakes'), corn)).toEqual({ qty: null, estimated: false, problem: 'needsGrams' });
  });
  it('a real portion is used', () => {
    expect(rowQuantity(one('3 rice cakes'), cake)).toEqual({ qty: { amount: 3, unit: 'portion', portionId: 'p2' }, estimated: false });
  });
});

describe('water', () => {
  it('amounts and glasses', () => {
    expect(readWater('500 ml water')).toEqual({ ml: 500 });
    expect(readWater('1,5 l vand')).toEqual({ ml: 1500 });
    expect(readWater('2 dl water')).toEqual({ ml: 200 });
    expect(readWater('I drank two glasses of water')).toMatchObject({ ml: 500, assumed: expect.stringContaining('250') });
    expect(readWater('et glas vand')).toMatchObject({ ml: 250 });
    expect(readWater('a bottle of water')).toMatchObject({ ml: 500 });
  });
  it('needs the word water', () => {
    expect(readWater('500 ml')).toBeNull();
    expect(readWater('500 ml milk')).toBeNull();
  });
  it('an impossible amount asks', () => {
    expect(readWater('20 litres of water')).toEqual({ ask: 'range', value: 20000, unit: 'ml' });
  });
});

describe('bodyweight', () => {
  it('needs a weight word, and keeps pounds as said', () => {
    expect(readBodyweight('I weigh 82,5')).toEqual({ kg: 82.5, assumedUnit: true });
    expect(readBodyweight('bodyweight 82.5 kg')).toEqual({ kg: 82.5 });
    expect(readBodyweight('vægt 180 lb')).toEqual({ kg: 81.65, entered: { value: 180, unit: 'lb' } });
    expect(readBodyweight('my weight is 80 kilos')).toEqual({ kg: 80 });
  });
  it('a bare number or kilos without the word is not a weight', () => {
    expect(readBodyweight('82.5')).toBeNull();
    expect(readBodyweight('82.5 kilos')).toBeNull();
  });
  it('an impossible body asks', () => {
    expect(readBodyweight('I weigh 12 kg')).toEqual({ ask: 'range', value: 12, unit: 'kg' });
    expect(readBodyweight('weight 900')).toEqual({ ask: 'range', value: 900, unit: 'kg' });
  });
});
