# Checkpoint 1 interview (27 Oct 2026)

Omar's answers, close to his words. These are the first real test case for the Coach, not settings:
nothing here gets hardcoded (see Decisions).

## Decisions from the interview
- **Aven 2 is for anyone, not just Omar** [Omar, 27 Oct]: "My friends use this app too, each on their own phone. Use my
  answers as the first real test case, never hardcode them. Everything the Coach knows about a person must come from
  onboarding, their own data and its memory, so it works for anyone."
- **Simple onboarding** [Omar, 27 Oct]: a new person tells the Coach about their life, in Danish or English.
- **Set up alone** [Omar, 27 Oct]: a friend must be able to set up the app alone, with their own AI key or with no key at all.

## Answers
1. **Weekdays:** works every weekday on split shifts (about 07:00–08:30 and 12:30–14:45). Usually trains after the
   whole day, around 15:00–16:00; sometimes right after the morning shift.
2. **Week (changes over time):** Mon wrestling · Tue push · Wed wrestling · Thu pull · Fri push or rest (usually 5 gym
   sessions a week) · Sat legs + shoulders · Sun pull. Takes almost every set to failure.
3. **Wrestling:** beginner, doesn't compete yet, wants to compete in the future.
   Omar on the Coach: it should be able to do what Claude does in this interview (ask, understand, remember, help), for anyone.
4. **Food:** still cutting. Hardest part is building a routine; on track to a routine where he doesn't binge.
5. **Food logging:** wants all of them: voice, typing, photo, barcode. (Note: photo needs an AI key; voice/text and
   barcode must work without one.)
6. **School:** online, done "when I have time". No school features. The Coach treats school, work and exams like any
   other life fact from memory ("exam week", "late shift"), and adapts training, sleep and food advice around them.
   **Keys:** all of Omar's friends will have their own AI key. The app is designed AI-first; the no-key mode still has to
   work (logging, tracking, plain numbers) but can be simpler.
