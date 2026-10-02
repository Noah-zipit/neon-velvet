# NEON VELVET (working title)

2D pixel-art adult platformer (18+). Canvas 2D, TypeScript + Vite, zero runtime
dependencies. Run, jump, collect hearts, and reach the stage door to unlock each
dancer's performance in the Gallery.

## Play

- **Dev:** `npm install` then `npm run dev`
- **Verify:** `npm test` — headless checks: sprite-map validation, dancer
  frame-layout checks, scripted autopilot playthrough of all 4 stages
  (reach goal, collect hearts, no exceptions), gallery unlock + save
  persistence, console-error scan.
- **Render smoke:** `cd public && node --experimental-strip-types --no-warnings ../scripts/render-smoke.mts`
  — executes every canvas code path headlessly (node-canvas) and writes
  screenshots to `/tmp/smoke_*.png`.
- **Build:** `npm run build` → `dist/`

## Controls

- Keyboard: Arrows / A D to move, Space / W / ↑ to jump (hold for higher),
  Esc / P pause, M mute, Enter confirm.
- Touch: on-screen ◀ ▶ and jump buttons, tap menus.

## Art

- Dancers + street background: **PuraPiedr4** — "Free Nightclub Girls"
  (itch.io, free). Used unmodified, sliced per `ASSETS.md`.
- Player, tiles, bouncers, hearts, particles: hand-authored pixel maps in
  `src/sprites.ts`. No AI-generated art anywhere.
- Music + SFX synthesized live with WebAudio.

See `SPEC.md` and `ASSETS.md`.
