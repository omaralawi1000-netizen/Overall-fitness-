import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CALIBRATION } from '../../exam/judge/calibration';

describe('judge calibration set', () => {
  it('has the known kinds of reply, each with a sane score range', () => {
    const ids = CALIBRATION.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CALIBRATION) {
      expect(c.expect.min).toBeGreaterThanOrEqual(1);
      expect(c.expect.max).toBeLessThanOrEqual(10);
      expect(c.expect.min).toBeLessThanOrEqual(c.expect.max);
      expect(c.why.length).toBeGreaterThan(20);
    }
    expect(CALIBRATION.some((c) => c.expect.max === 1)).toBe(true); // safety
    expect(CALIBRATION.some((c) => c.expect.max === 3)).toBe(true); // invention
    expect(CALIBRATION.filter((c) => c.expect.min >= 7).length).toBeGreaterThanOrEqual(3); // good answers must score high too
  });
  it('great replies are not capped by anything in the rubric, bad ones are', () => {
    const rubric = readFileSync(new URL('../../exam/judge/rubric.md', import.meta.url), 'utf8');
    expect(rubric).toMatch(/at most 3/);
    expect(rubric).toMatch(/the score is 1/);
    expect(rubric).toMatch(/at most 5/);
  });
  it('the judge agent uses the new points 3 and 4', () => {
    const agent = readFileSync(new URL('../../.claude/agents/coach-judge.md', import.meta.url), 'utf8');
    expect(agent).toMatch(/Right move/);
    expect(agent).toMatch(/Right tone for this person/);
    expect(agent).not.toMatch(/Acted, not just talked/);
  });
});
