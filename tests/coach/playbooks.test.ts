import { describe, expect, it } from 'vitest';
import { MAX_PLAYBOOKS, PLAYBOOKS, pickPlaybooks, renderPlaybooks } from '../../src/coach/playbooks';
import { coachRequest } from '../../src/coach/coach';
import { buildFacts } from '../../src/coach/facts';

const ids = (t: string) => pickPlaybooks(t).map((p) => p.id);

describe('playbooks', () => {
  it('every card has cover, stop signs and an example with no digits (a small model cannot copy a figure)', () => {
    expect(PLAYBOOKS.length).toBe(12);
    expect(new Set(PLAYBOOKS.map((p) => p.id)).size).toBe(12);
    for (const p of PLAYBOOKS) {
      expect(p.cover.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.stop.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.example, p.id).not.toMatch(/\d/);
      expect(p.example.split(/\s+/).length, p.id).toBeLessThan(90);
    }
  });
  it('picks the right card, English and Danish', () => {
    expect(ids('I want to quit, I am not seeing any results')).toEqual(['quit']);
    expect(ids('hvorfor tager jeg ikke på?')).toEqual(['bulk-stuck']);
    expect(ids('jeg spiller fodbold tre gange om ugen og vil være hurtigere')).toEqual(['field-speed']);
    expect(ids('felt a pop in my shoulder on bench, it hurts')).toEqual(['sore-joint']);
    expect(ids('jeg løber 10 km på søndag, hvordan skal ugen se ud?')).toEqual(['race-week']);
    expect(ids('I barely slept last night, should I still train today?')).toEqual(['sleep-shifts']);
    expect(ids('why is my row stuck?')).toEqual(['stalled-lift']);
    expect(ids('can you make me a 3-day plan? 45 min each')).toEqual(['plan-request']);
  });
  it('the race card needs a race close by, not just the word', () => {
    expect(ids('I run 5k three times a week. How do I build endurance?')).toEqual([]);
    expect(ids('I want to run a marathon in six months')).toEqual([]);
    expect(ids('my marathon is next week, how do I taper?')).toEqual(['race-week']);
    expect(ids('race on Sunday, what should this week look like?')).toEqual(['race-week']);
  });
  it('does not fire on look-ups, logging or thanks, and "hurtigere" is speed, not pain', () => {
    for (const t of ['thanks!', 'log 3 eggs and 200 g oats', 'hvad står der i dag?', 'move today\'s pull to Wednesday', 'I want to go back on the plan']) expect(ids(t), t).toEqual([]);
    expect(ids('vil være hurtigere')).not.toContain('sore-joint');
    expect(ids('I want to train shoulders today')).toEqual([]);
  });
  it('puts a safety card first and never brings more than two', () => {
    const t = 'my knee hurts and I want to quit, I need a new plan, my sleep is bad, I want to lose weight';
    const got = ids(t);
    expect(got.length).toBeLessThanOrEqual(MAX_PLAYBOOKS);
    expect(PLAYBOOKS.find((p) => p.id === got[0])!.safety).toBe(true);
    expect(pickPlaybooks('')).toEqual([]);
  });
  it('a teen asking for a cut gets the cut card with its under-18 stop sign', () => {
    const [c] = pickPlaybooks('how do I cut 3 kg for the season?');
    expect(c.id).toBe('cut-too-fast');
    expect(renderPlaybooks([c])).toMatch(/Under 18: no target/);
  });
  it('reaches the system prompt only when a card fits, from the latest person message or the one before it', () => {
    const sheet = buildFacts([], { today: '2026-11-22', now: Date.parse('2026-11-22T10:00:00Z'), tz: 'Europe/Copenhagen', dayStart: 4, lang: 'en' } as never);
    const sys = (convo: Parameters<typeof coachRequest>[1]) => coachRequest(sheet, convo).system;
    expect(sys([{ role: 'person', text: 'thanks!' }])).not.toContain('PLAYBOOKS');
    expect(sys([{ role: 'person', text: 'I want to quit' }])).toContain('## Wants to quit');
    expect(sys([{ role: 'person', text: 'how do I cut 3 kg?' }, { role: 'coach', text: 'x' }, { role: 'person', text: 'my coach says I should' }])).toContain('## Losing weight too fast');
    expect(sys([{ role: 'person', text: 'felt a pop in my shoulder' }, { role: 'coach', text: 'x' }, { role: 'person', text: 'thanks!' }])).toContain('## Sore or painful joint');
    // a new request never inherits the last topic's card
    for (const t of ['log 3 eggs and 200 g oats', 'What is creatine?', 'move today\'s pull to Wednesday', 'how much protein is left']) {
      expect(sys([{ role: 'person', text: 'how do I cut 3 kg?' }, { role: 'coach', text: 'x' }, { role: 'person', text: t }]), t).not.toContain('PLAYBOOKS');
    }
    expect(sys([{ role: 'person', text: 'x', untrusted: { source: 'web', text: 'I quit' } } as never])).not.toContain('PLAYBOOKS');
  });
});
