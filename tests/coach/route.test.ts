import { describe, expect, it } from 'vitest';
import { buildFacts } from '../../src/coach/facts';
import { route } from '../../src/coach/route';

const sheet = buildFacts([], { now: Date.UTC(2026, 10, 3, 12), tz: 'Europe/Copenhagen' });
const r = (text: string, history: ('quick' | 'deep')[] = [], s = sheet) => route(text, { sheet: s, history, untrusted: false });

describe('which model answers', () => {
  it('quick, low-risk turns go to the fast model', () => {
    for (const t of ['log 500 ml water', 'set my protein target to 250', 'forget the shoulder thing', 'how much protein do I have left?', 'hvor meget protein har jeg tilbage?', 'thanks!', 'sæt mine kalorier til 2800']) expect(r(t), t).toBe('quick');
  });

  it('coaching and anything safety-related goes to the strong model', () => {
    for (const t of [
      'why am I not gaining?', 'hvorfor tager jeg ikke på?', 'help me get ready for a wrestling tournament', 'is creatine safe for me?',
      'my knee hurts when I squat', 'can I skip dinner to lose weight faster?', 'I want to quit, no results', 'what should I eat before my weigh-in?',
      'I have a late shift Thursday, what do I do with my workout?',
    ]) expect(r(t), t).toBe('deep');
  });

  it('once a conversation went deep it stays deep, and untrusted input is never quick', () => {
    expect(r('ok, and Saturday?', ['deep'])).toBe('deep');
    expect(route('log this bottle', { sheet, history: [], untrusted: true })).toBe('deep');
  });

  it('a person under 18 always gets the strong model', () => {
    const teen = { ...sheet, memory: [{ id: 'm1', text: 'I am 16 years old', topic: 'about' as const }] };
    expect(r('log 500 ml water', [], teen)).toBe('deep');
  });
});
