import { describe, expect, it } from 'vitest';
import { fallback, findSlips, guard, retryNote } from '../../src/coach/slips';

const sheet = [2756, 2760, 3000, 84.8, 0.4, 140, 119];
const ids = (say: string, personText: string, extra: { minor?: boolean } = {}) => findSlips(say, { personText, sheetNumbers: sheet, ...extra }).map((s) => s.id);

describe('the three live checks', () => {
  it('flags an answer that only repeats the screen', () => {
    expect(ids('You average 2,756 kcal, maintenance is 2,760 and your goal is 3,000.', 'why am I not gaining?')).toEqual(['only-repeats']);
  });
  it('lets the same figures through when there is a step, a question or a lookup', () => {
    expect(ids('You average 2,756 kcal, maintenance is 2,760 and your goal is 3,000. Add one meal a day.', 'why am I not gaining?')).toEqual([]);
    expect(ids('You average 2,756 kcal, maintenance is 2,760, goal 3,000. Is that all you eat?', 'why am I not gaining?')).toEqual([]);
    expect(ids('Your maintenance is 2,760, your goal 3,000 and you average 2,756.', 'what is my maintenance and goal?')).toEqual([]);
  });
  it('flags an answer that ignores what the person just said', () => {
    expect(ids('Your squat is at 100 kg. Next up is 102.5.', 'I felt a pop in my shoulder on bench, it hurts')).toContain('ignores-message');
    expect(ids('I am on nights all week', 'I am on nights all week')).toEqual([]);
    expect(ids('Nights will clash with Full body A. Move it to Tuesday.', 'I am on nights all week')).toEqual([]);
    expect(ids('Your lifts are fine. Keep going.', 'ondt i knæet efter løbeturen')).toContain('ignores-message');
  });
  it('flags a bare referral when nothing here is a stop sign, never one that is', () => {
    expect(ids('Talk to a doctor or a dietitian about that.', 'is oat milk good for me?')).toEqual(['sends-away']);
    expect(ids('Talk to a doctor or a dietitian about that.', 'felt a pop in my shoulder, it hurts')).not.toContain('sends-away');
    expect(ids('Talk to a doctor about that.', 'how do I cut 3 kg?', { minor: true })).not.toContain('sends-away');
  });
  it('keeps a referral for the stop signs the playbooks name, and accepts a prerequisite question for an event', () => {
    expect(ids('See a doctor about the swelling.', 'My knee is swollen after training.')).not.toContain('sends-away');
    expect(ids('Tal med en læge om hævelsen.', 'mit knæ er hævet')).not.toContain('sends-away');
    expect(ids('Hvornår er vejningen? Så kan jeg sige, hvad du skal spise.', 'hvad skal jeg spise før en kamp kl 14?')).toEqual([]);
  });
  it('lets good answers through (saved answers that once raised false alarms)', () => {
    expect(ids("That makes sense when it feels like nothing is moving. Next up is squat 32.5 kg, bench 27.5 kg. Try Thursday's session.", 'I want to quit, I am not seeing any results')).toEqual([]);
    expect(ids('Nothing is planned for today. If you did get a rough night, drop a set or two. How are you feeling?', 'I barely slept last night, should I still train today?')).toEqual([]);
    expect(ids('Fordi du spiser på vedligehold: 2.756 mod 2.760, og målet er 3.000. Tag et ekstra måltid.', 'hvorfor tager jeg ikke på?')).toEqual([]);
  });
  it('says nothing when the Coach speaks first or has nothing to say', () => {
    expect(ids('Your lifts have sat for five sessions. Is your log everything you eat?', '')).toEqual([]);
    expect(ids('-', 'hello')).toEqual([]);
  });
  it('words the retry and the plain fallback', () => {
    const s = findSlips('Talk to a doctor.', { personText: 'is creatine worth it?', sheetNumbers: [] });
    expect(retryNote(s)).toContain('slipped');
    expect(fallback('da')).toContain('Tænk dybere');
    expect(fallback('en')).toContain('Think deeper');
  });

  describe('deliberately bad answers are caught', () => {
    const bad: [string, string, string, string][] = [
      ['only-repeats', 'why am I not gaining?', 'You eat 2,756 kcal, maintenance is 2,760 and your goal is 3,000.', 'a'],
      ['only-repeats', 'how am I doing?', 'Weight 84.8 kg, protein 119 g, target 140 g, maintenance 2,760 kcal.', 'b'],
      ['only-repeats', 'hvorfor tager jeg ikke på?', 'Du spiser 2.756 kcal, vedligehold er 2.760 og målet er 3.000.', 'c'],
      ['ignores-message', 'I felt a pop in my shoulder on bench, it hurts', 'Your squat is at 100 kg. Next up is 102.5.', 'a'],
      ['ignores-message', 'ondt i knæet efter løbeturen', 'Dine løft ser fine ud. Fortsæt som planlagt.', 'b'],
      ['ignores-message', 'I barely slept last night, should I still train today?', 'Full body A is on the plan. Squat 100 kg.', 'c'],
      ['ignores-message', 'I am on nights all week', 'Your protein is 119 g. Aim for 140 g.', 'd'],
      ['ignores-message', 'I have a match on Saturday', 'Your bench is 60 kg. Add 2.5 kg next time.', 'e'],
      ['ignores-message', 'I have a fever and feel awful', 'Your squat is at 100 kg. Next up is 102.5.', 'f'],
      ['sends-away', 'is oat milk good for me?', 'Ask a dietitian.', 'a'],
      ['sends-away', 'how much protein should I eat?', 'That is a question for a nutritionist or your GP.', 'b'],
      ['sends-away', 'hvor meget skal jeg spise?', 'Tal med en diætist om det.', 'c'],
    ];
    for (const [id, person, say, tag] of bad) {
      it(`${id} ${tag}: ${say.slice(0, 40)}`, () => {
        expect(ids(say, person)).toContain(id);
      });
    }
  });

  describe('guard', () => {
    const ctx = { personText: 'is oat milk good for me?', sheetNumbers: [] };
    it('passes a clean answer without asking again', async () => {
      let asked = 0;
      const g = await guard('Yes, fine. Try one glass.', ctx, 'en', async () => { asked++; return ''; });
      expect(g).toMatchObject({ say: 'Yes, fine. Try one glass.', retried: false, fellBack: false });
      expect(asked).toBe(0);
    });
    it('asks once with the reason and takes a good second answer', async () => {
      const notes: string[] = [];
      const g = await guard('See a doctor.', ctx, 'en', async (n) => { notes.push(n); return 'Yes, oat milk is fine. Try one glass.'; });
      expect(notes).toHaveLength(1);
      expect(g).toMatchObject({ say: 'Yes, oat milk is fine. Try one glass.', retried: true, fellBack: false });
    });
    it('falls back to the plain offer when the second answer slips too, and never asks a third time', async () => {
      let asked = 0;
      const g = await guard('See a doctor.', ctx, 'en', async () => { asked++; return 'Ask a dietitian.'; });
      expect(asked).toBe(1);
      expect(g).toMatchObject({ say: fallback('en'), retried: true, fellBack: true });
    });
  });
});
