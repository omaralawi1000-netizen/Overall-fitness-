import { describe, expect, it } from 'vitest';
import { CATCH, FRESH, TUNING } from '../../exam/yardstick/catch-lists';
import { catchRate, checkBody, checkOne, codeVerdicts, readChecks, replyOf } from '../../exam/yardstick/checker';
import { HAND_READ, HAND_READ_ROWS, handReadAgreement } from '../../exam/yardstick/hand-read';
import { CASES } from '../../exam/v2/cases';
import { CallError, Ledger, type GeminiReply } from '../../exam/providers';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CaseRun } from '../../exam/v2/run-case';

const caseOf = (id: string) => CASES.find((c) => c.id === id)!;
const run = (id: string, texts: string[], extra: { more?: string; did?: string[]; offers?: string[] } = {}): CaseRun => ({
  id, setup: 'test', usd: 0, checks: [], facts: 'NOW: Tuesday',
  turns: texts.map((text, i) => ({
    tier: 'deep', model: 'm', dropped: [], usd: 0, ms: 0, say: text,
    ...(i === texts.length - 1 && extra.more ? { more: extra.more } : {}),
    shown: { text, did: (extra.did ?? []).map((name) => ({ name, label: name })), offers: (extra.offers ?? []).map((name) => ({ label: name, proposal: { name } })), sources: [], refused: [] },
  })) as never,
});

describe('the catch lists', () => {
  it('cover 20 real tuning cases, about 6 items each, with unique ids named after their case', () => {
    expect(TUNING).toHaveLength(20);
    for (const id of TUNING) expect(caseOf(id), id).toBeTruthy();
    const ids = TUNING.flatMap((id) => CATCH[id].map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of TUNING) for (const x of CATCH[id]) expect(x.id.split('.')[0]).toBe(id.split('-')[0]);
    expect(ids.length).toBeGreaterThanOrEqual(100);
    for (const id of TUNING) expect(CATCH[id].length).toBeGreaterThanOrEqual(4);
  });

  it('keep the fresh cases apart from the tuning cases', () => {
    expect(FRESH).toHaveLength(10);
    for (const id of FRESH) { expect(caseOf(id), id).toBeTruthy(); expect(TUNING).not.toContain(id); }
  });

  it('every safety item is in a case that has one, and the hand-read only names real items', () => {
    expect(TUNING.flatMap((id) => CATCH[id]).filter((x) => x.safety).length).toBeGreaterThanOrEqual(8);
    for (const h of HAND_READ) expect(CATCH[h.case].some((x) => x.id === h.item && !x.code), h.item).toBe(true);
    for (const h of HAND_READ) expect(HAND_READ_ROWS[`${h.case}|${h.setup}`], `${h.case}|${h.setup}`).toBeTruthy();
  });

  it('compares the hand-read only with verdicts on the very answer that was read', () => {
    const h = HAND_READ.find((x) => x.set === 'chosen')!;
    const v = { [h.item]: { verdict: h.verdict === 'yes' ? 'no' : 'yes' } };
    const same = { row: HAND_READ_ROWS[`${h.case}|${h.setup}`], case: h.case, setup: h.setup, judge: 'j', verdicts: v };
    expect(handReadAgreement([same]).find((x) => x.judge === 'j (chosen)')?.misses).toContain(`${h.item}·${h.setup}`);
    expect(handReadAgreement([{ ...same, row: 'a newer answer' }])).toEqual([]);
  });
});

describe('the yes/no checker', () => {
  it('reads every item once, and refuses a missing, doubled or unknown one', () => {
    const ok = JSON.stringify({ items: [{ id: 'a', quote: 'x', verdict: 'yes' }, { id: 'b', quote: '', verdict: 'no' }] });
    expect(readChecks(ok, ['a', 'b'])).toEqual({ a: { verdict: 'yes', quote: 'x' }, b: { verdict: 'no', quote: '' } });
    expect(() => readChecks(JSON.stringify({ items: [{ id: 'a', quote: '', verdict: 'yes' }] }), ['a', 'b'])).toThrow(CallError);
    expect(() => readChecks(JSON.stringify({ items: [{ id: 'a', quote: '', verdict: 'yes' }, { id: 'a', quote: '', verdict: 'no' }] }), ['a'])).toThrow(/twice/);
    expect(() => readChecks(JSON.stringify({ items: [{ id: 'z', quote: '', verdict: 'yes' }] }), ['a'])).toThrow(/unknown/);
    expect(() => readChecks(JSON.stringify({ items: [{ id: 'a', quote: '', verdict: 'maybe' }] }), ['a'])).toThrow(/verdict/);
    expect(() => readChecks('not json', ['a'])).toThrow(/not JSON/);
  });

  it('decides code items for free: the creatine dose, Danish, length, nothing changed, no new target', () => {
    const o09 = CATCH['o09-healthy-adult-creatine'];
    expect(codeVerdicts(run('o09-healthy-adult-creatine', ['Yes. Take 3–5 g a day.']), o09)['o09.dose'].verdict).toBe('yes');
    expect(codeVerdicts(run('o09-healthy-adult-creatine', ['Yes, take 5 g.']), o09)['o09.dose'].verdict).toBe('no');
    const r04 = CATCH['r04-whats-today'];
    const v = codeVerdicts(run('r04-whats-today', ['I dag står der Ben og ryg.']), r04);
    expect([v['r04.plan'].verdict, v['r04.short'].verdict, v['r04.danish'].verdict]).toEqual(['yes', 'yes', 'yes']);
    expect(codeVerdicts(run('r04-whats-today', ['Today is legs and back.']), r04)['r04.danish'].verdict).toBe('no');
    expect(codeVerdicts(run('p08-missed-both', ['Ok'], { did: ['move_session'] }), CATCH['p08-missed-both'])['p08.nothing'].verdict).toBe('no');
    expect(codeVerdicts(run('p06-not-gaining-da', ['Du spiser for lidt'], { offers: ['set_target'] }), CATCH['p06-not-gaining-da'])['p06.no-target'].verdict).toBe('no');
  });

  it('shows the checker the facts, every turn, More and what the app did, never the setup, and only the model items', () => {
    const c = caseOf('m03-kcal-needs-goal');
    const items = CATCH[c.id].filter((x) => !x.code);
    const body = checkBody(c, { ...run(c.id, ['What is your goal?', 'Keep 2,300.'], { more: 'More text', did: ['remember'] }), setup: 'opusformat' }, items);
    const all = JSON.stringify(body);
    expect(all).toContain('turn 1');
    expect(all).toContain('More text');
    expect(all).toContain('did: remember');
    expect(all).toContain('NOW: Tuesday');
    expect(all).not.toContain('opusformat');
    for (const x of items) expect(all).toContain(x.id);
    expect(replyOf(run(c.id, ['a', 'b'])).texts).toEqual(['a', 'b']);
  });

  it('counts the cost of an unreadable reply once, then the retry', async () => {
    const ledger = new Ledger(join(mkdtempSync(join(tmpdir(), 'yard-')), 'ledger.jsonl'), 1);
    const c = caseOf('o09-healthy-adult-creatine');
    const ids = CATCH[c.id].filter((x) => !x.code).map((x) => x.id);
    const texts = ['not json', JSON.stringify({ items: ids.map((id) => ({ id, quote: '', verdict: 'yes' })) })];
    let n = 0;
    const dry = (): GeminiReply => {
      ledger.record({ at: '', model: 'm', purpose: 'p', usd: 0.006, usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, ok: true } as never);
      return { candidates: [{ content: { parts: [{ text: texts[n++] }] } }], usage: { inTokens: 0, cachedTokens: 0, outTokens: 0, searches: 0 }, usd: 0.006 };
    };
    const got = await checkOne('claude-sonnet-5-5', c, run(c.id, ['Yes. Take 3–5 g a day.']), CATCH[c.id], { ledger, purpose: 'catch', dry });
    expect(got.usd).toBeCloseTo(0.012, 6);
  });

  it('scores a split item half and any safety item a checker failed as a miss', () => {
    const items = [{ id: 's', kind: 'avoid', where: 'any', text: '', safety: true }, { id: 'c', kind: 'catch', where: 'any', text: '' }] as const;
    const yes = { verdict: 'yes', quote: '' } as const, no = { verdict: 'no', quote: '' } as const;
    const r = catchRate([...items], [{ s: yes, c: yes }, { s: no, c: yes }]);
    expect(r.points).toBe(1.5);
    expect(r.split).toEqual(['s']);
    expect(r.safetyMisses).toEqual(['s']);
    expect(catchRate([...items], [{ s: yes, c: no }]).points).toBe(1);
  });
});
