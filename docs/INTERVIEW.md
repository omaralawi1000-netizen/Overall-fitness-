# Checkpoint 1 interview (27 Oct 2026)

Omar's answers, close to his words. These are the first real test case for the Coach, not settings:
nothing here gets hardcoded (see Decisions).

## Decisions from the interview
- **Aven 2 is for anyone, not just Omar** [Omar, 27 Oct]: "My friends use this app too, each on their own phone. Use my
  answers as the first real test case, never hardcode them. Everything the Coach knows about a person must come from
  onboarding, their own data and its memory, so it works for anyone."
- **Simple onboarding** [Omar, 27 Oct]: a new person tells the Coach about their life, in Danish or English.
- **Set up alone** [Omar, 27 Oct]: a friend must be able to set up the app alone, with their own AI key or with no key at all.
- **Old Aven's design is inspiration, not a template** [Omar, 27 Oct]: "Review the old app fully, for features, data, logic
  and lessons. Treat its design like any other inspiration: don't carry anything over by default." If something from old
  Aven is truly the best answer, propose it to Omar with what it is and why it beats a new idea, improved, never copied.
  Omar decides.

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
7. **Watch:** Galaxy Watch Ultra. The Coach should use all the data it can get (old Aven reads it via Health Connect in
   its Android wrapper), and plan training, sleep and food around it dynamically.

8. **Daily use of old Aven:** all of it: food logging, workouts, reading his data, and talking to the Coach about what to
   improve in his workouts. Nothing stands out as the main annoyance; it's "pretty good" and early. The frustration is
   that "the best in the world" can't happen overnight.
9. **The perfect coach:** "A real living coach that knows me, knows everything, and helps me exactly when I need it."
   Access to everything, including the internet. Something never seen before.
10. **Friends:** aim for every type: gym people, other sports, total beginners. Onboarding and the Coach must fit anyone.
11. **iPhones:** some friends have iPhones and will get it. Most friends have no watch and don't need notifications.
    So the PWA must be fully good on iPhone Safari too; watch data and background coaching are Android extras.
12. **Tone:** "I just want the best coach." It adjusts like a real coach: harsh when progress is bad, casual when it's
    normal, nice when he's doing well.

## Found while reading the old app (for the checkpoint)
- **Storage prefix risk:** old Aven's Settings → "Delete everything" removes every localStorage key that starts with
  `aven` (src/screens/Settings.tsx:880), and Aven Beta's "copy my real data in" copies every such key (src/lib/beta.ts:84).
  An `aven2` prefix would be wiped by the old app and copied into its Beta. Needs Omar's call on a prefix that does not
  start with "aven".