# Aven 2: notes for Claude

## Start every session
1. Read `docs/BRIEF.md` first. It is the whole job.
2. Then `docs/PROGRESS.md` and `PLAN.md` once they exist. PROGRESS.md says what's done and the exact next step.
3. Taste and rules for judging: `docs/TASTE.md` (it wins over any skill). What Omar likes: `docs/inspiration/notes.md`.

## Talking to Omar
Plain, short words. He's not a programmer, he dictates (expect misheard words), and he judges everything on his phone.

## Skills (`.claude/skills/`)
- **frontend-design**, **emil-design-eng**: taste for every screen. Boldness in one place, quiet around it.
- **apple-design**: the default for motion, materials, sheets and gestures.
- **animation-performance**: check every animation against 120 fps and the cost of blur.
- **mobile-native**: the PWA must feel installed, never like a website.
- **prototype**: every design exploration. Runs only when invoked by name, so read `SKILL.md` and `PICKER.md` and follow them directly.
- **review-animations**: the motion-judge's rulebook (`SKILL.md`, `STANDARDS.md`). Also only by name.
- **verification-before-completion**: before saying anything is done, fixed or tested.
- **grill-me** (uses **grilling**): Omar may type /grill-me for the interview.

## Judges (`.claude/agents/`, read-only, they never edit)
- **design-judge**: screenshots, clips and UI code. Score 1–10, defects with the smallest fix, "needs phone" for blur, banding, smoothness and touch feel.
- **motion-judge**: motion code and clips. Defaults to flagging.
- **coach-judge**: Coach conversations and the Coach exam, against `docs/COACH.md`.

Run them before Omar sees anything visual or any Coach change. Spawn fresh ones every round and iterate until they stop finding real defects. They may suggest an exact fix; you apply it.

## Never
- Change `The-new-Claude-gym-app` (the old app). Read-only reference, cloned into `reference/` (gitignored).
- Commit real data or API keys. Never print `GEMINI_API_KEY`.
