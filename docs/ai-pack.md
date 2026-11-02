# Ask other AIs: the taste pack (2 Nov 2026)

Decision (Omar, 2 Nov): after the premium still ("This doesn't really look like a workout screen. This is much more for a today screen"), he will talk to other AIs (ChatGPT, Gemini and others) himself, show them what he rejected and liked, and let them propose and show concepts and ask him questions to find his taste. Our job: give him the pictures and one prompt.

## The pack
Shared folder `aven2/ai-pack/` (also on the artifact page "Aven Taste Pack"). Each board has its labels and his words drawn into the picture, so an AI that only sees the image still knows what it is.
- `1-rejected-ink-ink-rich-heat.jpg`: Ink, Ink rich, Heat.
- `2-rejected-dayline-rooms-ordinary.jpg`: Day line, Rooms, Ordinary.
- `3-rejected-workout-screens.jpg`: workout slice round 1, Volt, Daylight.
- `4-rejected-premium-still.jpg`: painted mountains + ring (looks like Today, not a workout).
- `5-liked-outside-apps-1.jpg` and `-2.jpg`: Oura, Sleep Cycle, MacroFactor, Copilot, Revolut, Opal, WHOOP.
- `6-liked-old-aven.jpg`: old Aven ingredients (liked, but not to be copied).
- `PROMPT.md`: the prompt (below).
Sources: `docs/taste-log.md`, `docs/keepers.md`, `docs/research/taste-2026-11-01.md`.

## How to use
1. Open a new chat in the other AI. Paste the prompt. Attach boards 1 to 6 (if it limits images: send 3, 4, 5-1 and 6 first, the rest when it asks).
2. Talk to it. Let it ask. Ask it to show pictures or HTML pages, not only words.
3. Take screenshots of what he likes and dislikes.

## Bringing results back
Tell us in the project chat, or paste into a new thread: the screenshots, plus two lines per picture: "I like this" or "I don't", and why, in his words. The AI's end summary (prompt step 6) goes in too. We add an entry to `docs/taste-log.md` and, for what he explicitly likes, `docs/keepers.md`. The next round builds from that, as a workout screen first.

## Prompt
    I'm designing a fitness app and I need help finding the visual style that fits me. I'm not a designer, so I can't describe it well, but I know it when I see it. I've rejected a lot of attempts, so I'm going to show you pictures of what I rejected and what I liked. Please don't just answer in words: show me.
    
    ABOUT THE APP
    It's called Aven. It's a gym, food and wrestling app for my phone (Android, 120 Hz screen, used one-handed, often sweaty, between sets). The main idea is a Coach that knows me and helps, so the app should feel alive and personal, like nothing else on the market. I want it to look like one of the best-designed apps in the world: when a stranger sees it they should ask "what app is that?"
    
    THE SCREEN I NEED MOST: THE WORKOUT SCREEN
    This is the screen I'm on for an hour in the gym. It has to do four jobs:
    1. Log a set: weight and reps, with one single tap to mark it done.
    2. Rest: after a set, a timer counts down. I glance at it from arm's length.
    3. Show where I am: which exercise, which set, what I did last time, and what's next.
    4. Celebrate records: when I lift my heaviest ever, it should feel special.
    It must look like the place where you lift. My last attempt was beautiful (painted mountains, a glowing ring) but I said it looked like a Today/home screen, not a workout screen.
    
    WHAT I REJECTED (see the pictures)
    - Looks that feel ordinary, "like other apps": plain dark pages with a blue accent (Ink), glass cards (Ink rich).
    - Full-screen red/orange colour with huge outline numbers (Heat). I liked it "a little", not enough.
    - A timeline-of-the-day layout, big poster numbers on colour fields, and a plain Hevy-style app. "I don't like any of it."
    - My own old app's look, redone: "very in my old style".
    - Then a stripped version, dark with lime or plain light: "very plain". And a light one: "better than the black, but still far off from my bar."
    - Beautiful scenery that doesn't say "workout".
    So: not generic, not plain, not a copy of my old app, not just pretty.
    
    WHAT I LIKE (see the pictures)
    - Apps that set my bar: Oura, Sleep Cycle, CRED, Any Distance, Revolut, Copilot, Not Boring. Common thread: calm screens with ONE big number, soft light with depth, glass you can see through, a serif line of text, a feeling of quality.
    - From my old app: a near-black room lit by one soft glow, clear see-through glass cards, italic serif names (like "Pull") beside thin light numbers, one orange thing to tap, a dotted orb, a medal at the finish. I like these ingredients but I don't want it to look like the old app.
    - Motion I like (I have a library of short clips; I can describe them if you ask): it should feel physical and continuous. Numbers have weight (they roll and count like dials). Things transform instead of being replaced (a card grows into a page, a button turns into its options). Big decisions are made with the hand (hold or slide), but ticking a set is exactly one tap. Colour lives inside controls and follows their value; it doesn't flood the whole room. The Coach is quiet (a small dot or an ask bar that becomes the conversation). A reward is a medal that flips and catches the light; a gem you crack open is for rare milestones only.
    - I have NOT decided on dark vs light, or on one fixed theme. I may want themes later, but one done perfectly first.
    
    WHAT I WANT FROM YOU
    1. First, in a few sentences, tell me what you think my taste is, based on the pictures and notes. Say what you're unsure about.
    2. Ask me questions to find out more, three or four at a time, not a huge list. Use simple choices where you can ("this or that?"). Show me small pictures or sketches with the questions whenever you can.
    3. Then propose 3 genuinely different visual concepts for the workout screen. Show each one as an actual image or a working HTML page I can open on my phone. Show at least these states: logging a set, resting, and a new record. Explain in one sentence what each concept is betting on.
    4. Be bold. Don't give me the safe, generic version. But keep it usable: it must pass the 5-second test (a stranger understands the screen and what to tap).
    5. When I react ("I like this part, not that part"), change it and show me again. Tell me honestly if something I ask for will clash with something else I said I like.
    6. At the end, write me a short summary of what I picked and rejected, in my own words, so I can take it to my other tools.
    
    Please use plain language. I'm not technical.
