# Window: Today build (prototype)

Ported from the Today build's `today-window.zip` (v6). See the entry in `docs/README.md`. The build is still iterating, so expect new versions as follow-up PRs.

## KNOWN-ISSUES
Found by the Codex review of the v6 port (3 Nov 2026). They are real edge cases in the prototype's workflow logic, left unfixed on purpose because this is a prototype and the source keeps changing. Fix them in the build, then re-port.

1. **A shortened plan does not reach a running workout.** Accepting Coach's 30-minute proposal while a workout is already minimised changes only `S.trimmed` and the plan cards. The live workout (`W.ex`, `W.total`) still runs all 16 sets.
2. **Log can be tapped again after the final set.** Closing the auto-opened "Whole workout" sheet leaves Log enabled. A second tap adds the same volume and record again, and the delayed `flyInto()` throws.
3. **Food Undo can hit the wrong entry.** Tapping Undo right after a quick-add (before the delayed `addFood()` runs) removes the previous food and the new one is still added. The keypad's Add has the same ordering.
4. **Steppers stay open after minimising.** If the weight or reps stepper is open when the workout is minimised, it stays visible and tappable over the other screens, and its taps still change the minimised workout.
