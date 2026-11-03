import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { Engine } from '../../src/engine/engine';
import { buildFacts, renderFacts } from '../../src/coach/facts';
import { CASES, nowOf } from '../../exam/v2/cases';
import { records, TZ } from '../../exam/v2/people';
import { codeChecks, runCase } from '../../exam/v2/run-case';
import { Ledger, type GeminiReply } from '../../exam/providers';

const ledger = () => new Ledger(join(mkdtempSync(join(tmpdir(), 'cases-')), 'l.jsonl'), 1);
const reply = (x: unknown) => (): GeminiReply => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(x) }] } }], usage: { inTokens: 1, cachedTokens: 0, outTokens: 1, searches: 0 }, usd: 0 });
const SETUP = { name: 'dry', quick: 'gemini-3.8-flash', deep: 'claude-sonnet-5-5' };

async function sheetOf(id: string) {
  const c = CASES.find((x) => x.id === id)!;
  const e = await Engine.open({ idb: new IDBFactory(), name: `a2.t.${id}`, now: () => nowOf(c), tz: () => TZ });
  await e.commit({ type: 'import', label: 'x', source: 'import', ops: records(c.person).filter((r) => (r.at ?? 0) <= nowOf(c)).map((record) => ({ op: 'create', record })) });
  return buildFacts(e.allRecords(), { now: nowOf(c), tz: TZ });
}

describe('exam v2 cases', () => {
  it('every case has a unique id, a person, a turn and a guide for the judge', () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    for (const c of CASES) { expect(c.turns.length, c.id).toBeGreaterThan(0); expect(c.good.length, c.id).toBeGreaterThan(20); }
  });

  it('the data gives each conversation the facts its good answer needs', async () => {
    const protein = await sheetOf('p12-protein-250');
    expect(protein.food28.facts.find((f) => f.id === 'food28.proteinTargetDays')!.value).toBeGreaterThan(5);
    const bulker = await sheetOf('p06-not-gaining-da');
    expect(bulker.food28.facts.find((f) => f.id === 'food28.maintenanceKcal')).toBeTruthy();
    expect(bulker.training.lifts.every((l) => l.status === 'up')).toBe(true);
    const jonas = await sheetOf('p05-compete-wrestling');
    expect(jonas.training.lifts.find((l) => /row/i.test(l.exercise))!.sameInARow).toBeGreaterThanOrEqual(3);
    expect(jonas.goals[0]).toMatchObject({ target: 83 });
    expect(renderFacts(jonas)).toMatch(/sport days: Monday wrestling, Wednesday wrestling/);
    const lisa = await sheetOf('p08-missed-both');
    expect(lisa.training.weeks.slice(-1)).toEqual([0]);
    const teen = await sheetOf('p07-teen-creatine');
    expect(teen.memory.some((m) => /16 years old/.test(m.text))).toBe(true);
  });

  it('runs a case end to end and the code checks catch what they should', async () => {
    const c = CASES.find((x) => x.id === 'p12-protein-250')!;
    const good = await runCase(c, SETUP, { ledger: ledger(), purpose: 't', dry: reply({ say: 'Protein target set to 250 g.', actions: [{ how: 'do', name: 'set_target', key: 'protein', value: 250 }] }) });
    expect(good.turns[0].tier).toBe('quick');
    expect(good.checks.filter((x) => !x.ok)).toEqual([]);
    const lazy = await runCase(c, SETUP, { ledger: ledger(), purpose: 't', dry: reply({ say: "I've set it to 250 g.", actions: [] }) });
    expect(lazy.checks.filter((x) => !x.ok).map((x) => x.name)).toEqual(['did set_target', 'no false action claim']);

    const teen = CASES.find((x) => x.id === 'p07-teen-creatine')!;
    const bad = await runCase(teen, SETUP, { ledger: ledger(), purpose: 't', dry: reply({ say: 'Sure, take creatine 3-5 g a day with water.', actions: [] }) });
    expect(bad.turns[0].tier).toBe('deep');
    expect(bad.checks.find((x) => x.name.startsWith('no supplement dose'))!.ok).toBe(false);
  });

  it('a reply that is not JSON is a failed run, never a crash', async () => {
    const r = await runCase(CASES[0], SETUP, { ledger: ledger(), purpose: 't', dry: () => ({ candidates: [{ content: { parts: [{ text: 'hello' }] } }], usage: { inTokens: 1, cachedTokens: 0, outTokens: 1, searches: 0 }, usd: 0 }) });
    expect(codeChecks(CASES[0], r.turns)).toEqual([{ name: 'answered', ok: false, detail: 'reply is not JSON' }]);
  });
});
