# Aven 2: notes for Claude

## Start every session
1. Read `docs/BRIEF.md` first. It is the whole job.
2. Then `docs/PROGRESS.md` and `PLAN.md` once they exist. PROGRESS.md says what's done and the exact next step.
3. Taste and rules for judging: `docs/TASTE.md`. Omar's latest words win over it, over older docs and over any skill. Design starts from a blank page (1 Nov): old Aven, `site/lab/` and `docs/history/old-aven-review.md` are history, not direction. What Omar likes: `docs/inspiration/notes.md` and `docs/inspiration/web-references.md`.

## Talking to Omar
Plain, short words. He's not a programmer, he dictates (expect misheard words), and he judges everything on his phone.

## Skills (`.claude/skills/`)
- **frontend-design**, **emil-design-eng**: references for taste on every screen.
- **apple-design**: a reference for motion, materials, sheets and gestures, not a house style.
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
- Commit real data or API keys. The Gemini key is injected as a header by the environment (no variable); never put it in code, commits or logs.

## Working efficiently (Omar, 1 Nov, updated after the model research)
Default model is **Sonnet 5.5, high effort**. It costs half of Opus 5.5 per token and is close on coding. Model and effort are Omar's to switch. When the work calls for a different setting, tell him which one and why.
- **Opus 5.5, high:** design direction and the key screens of the chosen look, DESIGN.md, signature-moment motion, the Coach brain and exam judging, anything touching user data. Riskiest work (data import, backup, storage): Opus main with Opus as advisor.
- **Normal build phases:** Sonnet on high as main model, Opus as advisor (`/advisor opus`). Ask the advisor before committing to an approach, when an error repeats, and before calling a task done. Still stuck: tell Omar to switch to Opus.
- **Small fixes, copy and doc edits:** Sonnet on low, alone.
- **Never max effort** (overthinks, wastes tokens). Thinking is billed as output, the expensive part.
- **Agents are the real drain.** Every subagent, judge or workflow agent is a full session on top of the main one (agent teams about 7x). No subagents or workflows unless Omar asks. Judges: **one round** per visual change, before Omar sees it, then fix and show him. No loops of fresh judges until they find nothing. Judges and subagents run on Sonnet unless the job is Coach-exam judging.
- Keep sessions short and clear: one phase per session, `/clear` between unrelated tasks, `/compact` before a long break. Long context is re-sent on every message. 1M context costs no extra per token.
- Check `/usage` now and then: it shows the share that went to subagents, skills and MCP.
- If a Sonnet-built screen feels less polished on Omar's phone, send that screen to Opus. That is the accepted trade-off.
- If the same fix fails twice, stop and tell Omar (stronger model or a new approach). If you skipped a file or didn't test, raise the effort.
- On long tasks, commit, push and update PROGRESS.md after each working step, so a usage-limit cutoff loses nothing.
- Don't re-read large files already summarised in docs. Build concepts only to "judgeable"; polish only the winner.
- Judges only for work Omar will see. Blur and banding are judged on his phone, never headless.

## References
- Read only the reference file for the topic you're working on. Layout: `docs/README.md`.

## Keep it clean
- Prototypes live only under `site/_prototypes/`. After Omar picks, delete the losers in the same session.
- No new doc if an existing one fits. Decisions go in BRIEF or the dated design doc.
- No dead code, unused files, copied assets or commented-out blocks. Delete what you replace.
- Before finishing, check `git status` and `docs/README.md` for strays and dead links.
