# LESSONS from old Aven that still apply

Facts and taste learned the hard way (Oct 2026). Not old CSS rules: the new design solves these its own way.

## The phone (Galaxy S26 Ultra, Chrome, installed PWA, 120 Hz, 384 px, DPR 3.75)
1. Headless screenshots lie about blur and banding. Only the phone judges them: mark "needs phone", send to Beta.
2. Chrome on the phone draws gradients and blur output in whole 8-bit steps: big soft glows show rings. Fix it by
   design (fewer, smaller, busier gradients; noise in the picture), not with a dither engine bolted on later.
3. Adding or dropping a compositor layer mid-animation gives black frames. Layers that move exist before the motion
   and stay after it. Entrance animations end on their neutral state, never on an explicit last keyframe.
4. Live blur on many cards measured about half the frame rate (36 fps on 20 Oct). Blur is a budget: count blurred
   layers per screen, keep them small and still, measure on Beta. Never solve lag by removing blur.
5. Animating `box-shadow`, `width`/`height`/`top`, or CSS variables on `<html>` restyles or repaints every frame.
   Transform and opacity are the cheap path; anything else is measured first.
6. On the phone, a script count-up runs at about 60 fps; browser-driven (WAAPI/CSS) animation reaches 120.
7. Too many full-screen layers starve the GPU and show blank patches. Release a leaving layer fast.
8. Tab switches drew only ~30 fps when leaving layers piled up. Interrupted transitions must not stack.
9. A tap must show on the very next frames (press dip at ~50 ms). Never wait on a timer before opening something.
10. Android Back must close the top sheet, and a closing sheet must be catchable and turn round mid-motion.

## Voice, mic and speech
11. Bluetooth earbuds drop the mic into call mode and wreck audio: prefer the phone's own mic.
12. Whisper (Groq) is the best Danish/English hearing; it echoes its prompt on silence and invents subtitle lines
    ("Danske tekster", "Thanks for watching") in noise. Filter both; never send silence.
13. Whisper mishears Danish brands ("Cheasy" → "cheesy") without a list of names in its prompt.
14. On Auto language, mixed Danish/English is sometimes heard as Norwegian or Dutch: re-run as da and en, keep the best.
15. Hands-free always-on listening failed: it misheard Omar and reacted to him talking to others. Listen only after a tap.
16. The browser's own speech recognition is a weak fallback (needs network, no Danish nuance), but better than nothing.
17. Gemini TTS: play only the WAV data chunk (trailing metadata = loud burst), keep chunks short so speech starts fast.

## Food data
18. Open Food Facts covers Danish packaged food well enough; a bundled Danish list (3,660 products) makes search instant
    and offline. ODbL: credit it. USDA needs a server, which GitHub Pages doesn't have.
19. A missing nutrient is unknown, never zero. Show totals as "at least" when something is missing.
20. Portions: a typical portion is an estimate and says so. Dictated "one banana" is marked estimated.
21. AI food estimates (photo, text) are always shown as estimates for review, never logged as facts.
22. Big slips happen (a 4,170 kcal corn-cake portion): flag amounts far from the person's own usual.

## The Coach
23. The app computes, the model words it. Numbers in a reply come from code, never from the model's maths.
24. One shared fact summary feeds every surface, so Today, the chat and the review never disagree.
25. Every action is a card with its own Undo. Anything destructive is a preview first.
26. Safety limits live in code, not only in the prompt. No memory or preference unlocks a water cut, fasting or purging.
27. Mega-prompts patched round after round start contradicting themselves. Keep principles short; look the rest up.
28. The cheap model's variance is most of what's left: test with the model friends will really use.
29. "Never tell me to train lighter" was Omar's rule. For anyone else it's a preference the Coach learns.

## Omar's taste (rejected looks, never bring back)
30. Any warm or orange tint on a surface reads as orange. Colour goes on tappable or meaningful things only.
31. Grey, navy and brown "mud" glass: rejected. Opaque charcoal "clean look": "ruined".
32. Accent glow in a card corner reads as a stain. Accent-tinted glass reads brown.
33. Melting / cross-fade pop-up opens feel unnatural: a real frame that moves is wanted.
34. Collapsing large titles and title-font experiments: dropped. Camera drift on figures read as wobble.
35. Swipe to tick a set: removed for good. Tapping is the only way.
36. Seamless settle: the last moving frame and the first still frame are the same picture.
37. Fewer knobs. Eight palettes and nine backgrounds were too many to make perfect.
