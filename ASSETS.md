# Asset manifest — NEON VELVET (working title)

All art is real artist-made work. No AI-generated sprite sheets anywhere in this game.
Player character and tiles are hand-authored pixel art written directly in code.

## Pack 1: "Free Nightclub Girls" by PuraPiedr4 (itch.io)
Free pack. Files in `assets/dancers/`:

| File | Size | Layout | Content |
|---|---|---|---|
| `Sprite.png` | 3000x628 | single image | Nightclub street at night: neon-lit buildings, NIGHT CLUB / PLAZA CLUB signs. Used as parallax background. |
| `1_Uncensored.png` | 288x144 | 3 frames of 96x144 | Nude dancer, black hair, thigh-high stockings, heels. Short strip (3 frames — loop as idle sway). |
| `2_uncensored.png` | 2048x96 | 32 frames of 64x96 | Nude dancer, short purple hair. Full dance loop. |
| `3_UNcensored.png` | 1920x96 | 30 frames of 64x96 | Nude dancer, long black hair. Full dance loop. |
| `4_export.png` | 12096x144 | 126 frames of 96x144 | Dancer in black lingerie (bra + panties), long black hair. Long dance loop (verified: single dancer, frames repeat). |

Frames are on a strict regular grid, pitch verified by autocorrelation (0.96+).
Dancer names (in-game, invented): VIOLET (purple hair), RAVEN (black hair nude),
ONYX (black lingerie), ROXY (stockings).

## Credits (in-game credits screen)
- Dancers + street background: PuraPiedr4 — "Free Nightclub Girls" (itch.io, free)
- Player sprite + tiles: hand-authored pixel art for this game

## Explicitly NOT used
- NsfwMist "NSFW Pose Pack": sketch bases, not pixel art — wrong style, not game-ready.
- CooldeviL "Boy sprites": large VN illustrations, not pixel art — wrong style/scale.
