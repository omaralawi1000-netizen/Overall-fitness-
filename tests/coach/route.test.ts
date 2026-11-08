import { describe, expect, it } from 'vitest';
import { buildFacts } from '../../src/coach/facts';
import { route } from '../../src/coach/route';

const sheet = buildFacts([], { now: Date.UTC(2026, 10, 3, 12), tz: 'Europe/Copenhagen' });
const r = (text: string, history: ('quick' | 'deep' | 'big')[] = [], s = sheet) => route(text, { sheet: s, history, untrusted: false });

describe('which model answers', () => {
  it('quick, low-risk turns go to the fast model', () => {
    for (const t of ['log 500 ml water', 'set my protein target to 250', 'forget the shoulder thing', 'how much protein do I have left?', 'hvor meget protein har jeg tilbage?', 'thanks!', 'sæt mine kalorier til 2800']) expect(r(t), t).toBe('quick');
  });

  it('coaching and anything safety-related goes to the strong model', () => {
    for (const t of [
      'why am I not gaining?', 'hvorfor tager jeg ikke på?', 'help me get ready for a wrestling tournament', 'is creatine safe for me?',
      'my knee hurts when I squat', 'can I skip dinner to lose weight faster?', 'I want to quit, no results', 'what should I eat before my weigh-in?',
      'I have a late shift Thursday, what do I do with my workout?',
    ]) expect(r(t), t).not.toBe('quick');
  });

  it('once a conversation went deep it stays deep, and untrusted input is never quick', () => {
    expect(r('ok, and Saturday?', ['deep'])).toBe('deep');
    expect(route('log this bottle', { sheet, history: [], untrusted: true })).toBe('deep');
  });

  it('a person under 18 always gets the strong model', () => {
    const teen = { ...sheet, memory: [{ id: 'm1', text: 'I am 16 years old', topic: 'about' as const }] };
    expect(r('log 500 ml water', [], teen)).toBe('deep');
  });

  it('short ways of writing an age count too: "17, plays handball", "age 16", "15yo" (Codex, PR #81)', () => {
    const said = (text: string) => ({ ...sheet, memory: [{ id: 'm1', text, topic: 'about' as const }] });
    for (const t of ['17, plays handball', 'age 16', '15yo', '16-årig fodboldspiller']) expect(r('set my calories to 1500', [], said(t))).toBe('deep');
    expect(r('set my calories to 1500', [], said('Benches 17 kg dumbbells'))).toBe('quick');
  });
});

describe('the biggest tasks go to the big model (Omar, 8 Nov)', () => {
  it('plans, the weekly review, weight-class and cut plans, and why across weeks', () => {
    for (const t of [
      'make me a new training plan', 'can you build a 3 day program for me', 'rebuild my split around wrestling', 'lav en ny træningsplan til mig',
      'review my week', 'gennemgå ugen', 'I want to make 74 kg for the tournament', 'which weight class should I wrestle in?', 'plan my cut',
      'why have I been stuck on bench for weeks?', 'hvorfor står min squat stille?', 'why am I not gaining?',
      'hvorfor tager jeg ikke på?', 'kan du lave en plan for this week', 'jeg løber 10 km på søndag, hvordan skal ugen se ud?', 'how do I cut 3 kg for the season?', 'I want to compete in wrestling next spring, help me get ready to compete', '83 kg class, weigh-in the day before', 'gennemgå min uge', 'help me prepare for the tournament in March', 'gør mig klar til stævnet', 'I need a new program', 'jeg vil have en ny træningsplan', 'ugentlig gennemgang tak', 'planlæg min uge', 'why has my bench not moved in weeks?',
    ]) expect(r(t), t).toBe('big');
    expect(route('', { sheet, history: [], untrusted: false, notice: 'weekly review' })).toBe('big');
  });

  it('everyday logging, chat and single questions stay off it', () => {
    for (const t of ['log 500 ml water', 'thanks!', 'my knee hurts when I squat', 'what should I eat before my weigh-in?', 'why is protein important?', "help me get ready for today's workout", 'gennemgå min squat', 'gennemgå mit måltid', 'gør mig klar til træning', 'what is my new plan?', 'how many sessions are in my new routine?', 'hvad er min nye plan?', 'hvor mange ugentlige træninger har jeg?', 'hvad er mit ugentlige kaloriemål?', 'hvad er min plan for ugen?', 'planlæg mit måltid', 'why do I train 3 times a week?', 'hvad laver jeg i dag ifølge min plan?', 'I have a late shift Thursday, what do I do with my workout?', 'move today to tomorrow']) expect(r(t), t).not.toBe('big');
    expect(route('', { sheet, history: [], untrusted: false, notice: 'morning, Pull day' })).toBe('deep');
  });

  it('a big conversation keeps the big model for its follow-ups', () => {
    expect(route('ok, make it 3 days instead', { sheet, history: ['big'], untrusted: false })).toBe('big');
  });
});
