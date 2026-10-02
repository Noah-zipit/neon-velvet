# NEON VELVET — build spec (working title; Ashar renames later)

2D pixel-art adult platformer. Canvas 2D, TypeScript + Vite. Crisp pixels
(`image-rendering: pixelated`), fixed internal resolution scaled to fit,
native devicePixelRatio-aware like Rahsa Cafe (fps governor if needed).

## Concept
A neon nightclub street at night. You play a guy in a leather jacket running
the strip. Four stages, one dancer per stage finale. Finish a stage -> her
nude/lingerie dance performance plays full-screen -> unlocked in the Gallery.

## Screens
1. **18+ gate** — hard gate, "I am 18+" / exit. Remember choice in localStorage.
2. **Title** — game logo, Press Start, Gallery, Credits, mute toggle.
3. **Stage select / intro** — 4 stages: ROOFTOPS, NEON ALLEY, CLUB FLOOR, VIP LOUNGE.
   Stages unlock in order. Each shows its dancer's name + silhouette.
4. **Gameplay** — side-view platformer:
   - Player: hand-pixeled guy (~24x32 px), run left/right, jump (variable height),
     coyote time, jump buffering. Touch buttons (left/right/jump) + keyboard
     (arrows/AD + space).
   - Camera follows player horizontally, slight vertical lookahead.
   - Parallax: `Sprite.png` street as far background layer (tiled/scaled),
     plus 2 procedural near layers (silhouette rooftops, neon signs) drawn in code.
   - Platforms: hand-pixeled neon tile set (dark concrete + neon edge glow),
     static + moving platforms, gaps = fall = respawn at checkpoint (lose hearts).
   - Collectibles: hearts (score). Hazards: bouncers (patrolling pixel thugs —
     touch = knockback + lose hearts), gaps, steam vents (timed).
   - Goal: reach the dancer's stage door at the end -> performance cutscene.
   - HUD: hearts count, stage name, pause button. Pause menu: resume, restart,
     quit to title, mute.
5. **Performance cutscene** — full-screen: dancer's real animation strip looped
   at ~12fps on a club stage (spotlights, silhouettes of crowd, neon frame).
   Her name card. "Unlocked in Gallery". Tap to continue -> next stage.
6. **Gallery** — the 4 dances replayable once unlocked (locked = silhouette).
7. **Credits** — per ASSETS.md.

## Difficulty curve
Stage 1: flat, small gaps, no hazards (tutorial-ish, few signs).
Stage 2: gaps + first bouncer.
Stage 3: moving platforms + steam vents + 2 bouncers.
Stage 4: everything, tighter jumps.

## Art rules (hard)
- Dancer animations: ONLY the real PuraPiedr4 strips, frame layouts per ASSETS.md.
  Never redraw, trace, or "enhance" them.
- Player, tiles, bouncers, hearts, particles: hand-authored pixel art in code
  (typed pixel maps), matching the night-neon palette (magentas, cyans, deep blues).
- NO AI-generated sprites, NO AI images anywhere.
- Background: real Sprite.png + code-drawn parallax layers only.

## Tech
- Vite + TypeScript, zero runtime deps.
- Game loop: fixed timestep (60Hz) with accumulator, delta-clamped.
- Audio: WebAudio-synthesized (no external files) — chiptune bass loop, jump/
  collect/goal blips, crowd ambience noise. Mute toggle persisted.
- Save: localStorage — unlocked stages, gallery, hearts total, mute, 18+ flag.
- Mobile-first: touch controls, viewport-fit canvas, prevent scroll/zoom gestures
  on the canvas, portrait + landscape both playable (letterboxed stage view).

## Verification (must all pass before handoff)
- `tsc --noEmit` clean, `vite build` clean.
- Headless playtest per stage: player can move, jump, collect a heart, reach the
  goal (scripted input or physics sim), no exceptions, performance cutscene
  triggers, gallery unlock persists.
- Frame-layout check: dancer strips sliced per ASSETS.md (spot-check pixel
  content differs across frames).
- No console errors during a full stage-1 run.

## Deliverable
Commit + push to Noah-zipit/neon-velvet (author Noah-zipit <noahext994@gmail.com>),
deploy to Vercel, report the live URL + verification results.
