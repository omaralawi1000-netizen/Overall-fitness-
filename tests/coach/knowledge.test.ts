import { describe, expect, it } from 'vitest';
import { KNOWLEDGE, renderKnowledge } from '../../src/coach/knowledge';

describe('expert knowledge pack', () => {
  it('covers every topic the brief asks for, once each', () => {
    const ids = KNOWLEDGE.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['protein', 'cutting', 'recovery', 'strength', 'beginners', 'wrestling-weight', 'under-18']) expect(ids).toContain(id);
  });

  it('every guideline cites at least one source with a year and a link, and has a checked date', () => {
    for (const g of KNOWLEDGE) {
      expect(g.sources.length, g.id).toBeGreaterThan(0);
      for (const s of g.sources) {
        expect(s.url, g.id).toMatch(/^https:\/\//);
        expect(s.year, g.id).toBeGreaterThan(1990);
        expect(s.year, g.id).toBeLessThanOrEqual(Number(g.checked.slice(0, 4)));
      }
      expect(g.checked, g.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.points.length, g.id).toBeGreaterThan(0);
    }
  });

  it('has the safety lines built in: no water cuts, no doses or cuts for under-18s', () => {
    const all = renderKnowledge();
    expect(all).toMatch(/Never water cuts/);
    expect(all).toMatch(/under-18s, no supplement doses and no cutting or weight-loss targets/);
    expect(KNOWLEDGE.find((g) => g.id === 'creatine')!.points.join(' ')).toMatch(/Not for under-18s/);
  });

  it('stays short enough to send with every question', () => {
    // about 4 characters a token: the pack must stay under ~1,750 tokens so it costs little on every call
    expect(renderKnowledge().length).toBeLessThan(7000);
  });
});
