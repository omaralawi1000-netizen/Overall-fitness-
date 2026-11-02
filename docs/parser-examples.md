# Parser examples

What the instant parser (`src/engine/parse/`) reads, with the exact words it gives back. A test (`tests/parse/examples.test.ts`) runs every row, so this page cannot drift from the code. To add an example, add a row; to change one, change the code and the row together.

How to read it:
- **Workout**: `open` means a workout is being logged (sets, "same again", "done" count); `none` means no workout is open.
- The parser reads text only. It saves nothing, and never calls a network or an AI.

## The rules
1. **It refuses to guess.** If it is not sure, it asks (with the readings it can see) or it ignores the phrase. Talking to someone else never logs anything.
2. **A "no" inside a phrase is a correction.** "80… no, 60" means 60. A new part that names what it replaces ("no 9 reps", "no 82.5 kilos") changes only that. A bare number against both reps and kilos ("8 at 80, no 85") asks which.
3. **Only a whole phrase undoes.** "undo" or "fortryd" undoes; a bare "no" asks what was meant.
4. **A bare number is reps.** A weight needs its unit ("82.5 kilos") and a body weight needs its word ("I weigh…", "vægt…"). A half rep ("8.5") is not a set.
5. **Water and body weight check the number.** A body under 30 kg or over 300 kg, or a drink over 5 litres, is asked about, never logged.
6. **Food needs an amount said out loud.** "a banana" alone is too thin (could be talk) unless "I ate" or a meal word comes with it. Parts it cannot read are listed, not dropped.
7. **"80 x 8" asks.** A multiplication sign does not say which number is the weight; a unit does ("80 kg x 8"). A second set with its own weight ("80 for 8 and 60 for 10") is not read as more reps: it is handed back unread.
8. **Pounds are kept as said** and stored as kilos to two places.

## Examples

| Phrase | Workout | Reading |
|---|---|---|
| `8 at 80` | open | Log a set: 8 reps at 80 kg |
| `80 for 8` | open | Log a set: 8 reps at 80 kg |
| `eight at eighty` | open | Log a set: 8 reps at 80 kg |
| `otte på firs` | open | Log a set: 8 reps at 80 kg |
| `62 og en halv til 8` | open | Log a set: 8 reps at 62.5 kg |
| `82.5 kilos` | open | Log a set: 82.5 kg |
| `180 lb for 5` | open | Log a set: 5 reps at 180 lb (81.65 kg) |
| `same again` | open | Same as the last set |
| `samme igen` | open | Same as the last set |
| `done` | open | Set done |
| `færdig` | open | Set done |
| `skip this set` | open | Skip this set |
| `spring over` | open | Skip this set |
| `+15 seconds` | open | Add 15 s to the rest |
| `one minute more` | open | Add 60 s to the rest |
| `undo` | open | Undo the last thing |
| `fortryd` | none | Undo the last thing |
| `80, no 60` | open | Log a set: 60 reps |
| `8 at 80, no 9 reps` | open | Log a set: 9 reps at 80 kg |
| `8 at 80, no 82.5 kilos` | open | Log a set: 8 reps at 82.5 kg |
| `8 at 80, no 85` | open | Not sure which number you changed. Did you mean: Log a set: 8 reps at 85 kg? Did you mean: Log a set: 85 reps at 80 kg? |
| `8 at 80, no 8 at 85` | open | Log a set: 8 reps at 85 kg |
| `8 at 80, no skip` | open | Skip this set |
| `no` | open | Not sure: "no" to what? Say "undo" to take the last thing back, or say the set again. |
| `nej` | open | Not sure: "no" to what? Say "undo" to take the last thing back, or say the set again. |
| `80 x 8` | open | Not sure which number you changed. Did you mean: Log a set: 8 reps at 80 kg? Did you mean: Log a set: 80 reps at 8 kg? |
| `80 kg x 8` | open | Log a set: 8 reps at 80 kg |
| `8 at 80, no undo` | open | Not sure what to change. |
| `no problem` | open | Nothing logged: that did not look like a set, meal, water or weight. |
| `8 at 80` | none | Nothing logged: no workout is open. |
| `500 ml water` | none | Water: 500 ml |
| `two glasses of water` | none | Water: 500 ml (a glass counted as 250 ml) |
| `1,5 l vand` | none | Water: 1500 ml |
| `20 litres of water` | none | Not sure: 20000 ml of water? |
| `I weigh 82,5` | none | Body weight: 82.5 kg (no unit said: kilos) |
| `bodyweight 180 lb` | none | Body weight: 81.65 kg (said 180 lb) |
| `vægt 82,5 kg` | none | Body weight: 82.5 kg |
| `I weigh 12 kg` | none | Not sure: 12 kg as a body weight? |
| `82.5` | open | Nothing logged: that did not look like a set, meal, water or weight. |
| `200 grams of skyr, one banana and 60 grams of oats` | none | Food: 200 g skyr; 1 banana; 60 g oats |
| `1,5 dl mælk og 2 skiver rugbrød` | none | Food: 150 ml mælk; 2 slice rugbrød |
| `I had 2 eggs for breakfast` | none | Food for breakfast: 2 eggs |
| `a banana` | none | Nothing logged: that did not look like a set, meal, water or weight. |
| `I ate a banana` | none | Food: 1 banana |
| `200 grams skyr and some stuff` | none | I read only part of it (not read: some stuff). Did you mean: Food: 200 g skyr? |
| `bench press 80 kilos for 8, 8 and 6` | none | Barbell Bench Press: 8 reps at 80 kg, 8 reps at 80 kg, 6 reps at 80 kg |
| `squat 100 x 5 x 3` | none | Back Squat: 5 reps at 100 kg, 5 reps at 100 kg, 5 reps at 100 kg |
| `plank 60 seconds then run 5 km in 25 minutes` | none | Plank: 1 min / Run: 5 km in 25 min |
| `bench 135 lb for 5` | none | Barbell Bench Press: 5 reps at 135 lb (61.23 kg) |
| `hello there` | open | Nothing logged: that did not look like a set, meal, water or weight. |
| `can you spot me` | open | Nothing logged: that did not look like a set, meal, water or weight. |
| `I did 8 at 80 yesterday with my friend and it was hard` | open | Nothing logged: that did not look like a set, meal, water or weight. |
| `a dog and a cat` | none | Nothing logged: that did not look like a set, meal, water or weight. |
| `see you at 8` | open | Nothing logged: that did not look like a set, meal, water or weight. |
