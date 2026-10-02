// Stage layouts for NEON VELVET.
// Units: pixels, y-down. Canvas is 480x270; baseline platform top y=208.
// Physics budget: max jump height ~98px, comfortable jump distance ~85px.
// All gaps <= 72, all step-ups <= 48, so every stage is beatable.
// Hearts sit at platformTop - 15 (overlapping the 30px-tall player hitbox).

import type { LevelDef } from "./types.ts";

function doorAt(levelWidth: number): LevelDef["goal"] {
  return { x: levelWidth - 120, y: 144, w: 40, h: 64 };
}

export const LEVELS: LevelDef[] = [
  // ------------------------------------------------------- 1: ROOFTOPS
  {
    name: "ROOFTOPS",
    width: 3000,
    killY: 420,
    spawn: { x: 40, y: 120 },
    goal: doorAt(3000),
    platforms: [
      { x: 0, y: 208, w: 520, h: 62, neon: "cyan" },
      { x: 584, y: 208, w: 460, h: 62, neon: "cyan" },
      { x: 1108, y: 176, w: 380, h: 94, neon: "cyan" },
      { x: 1552, y: 176, w: 420, h: 94, neon: "cyan" },
      { x: 2036, y: 208, w: 440, h: 62, neon: "cyan" },
      { x: 2540, y: 208, w: 460, h: 62, neon: "cyan" },
    ],
    hearts: [
      { x: 300, y: 193 }, { x: 700, y: 193 }, { x: 1250, y: 161 },
      { x: 1700, y: 161 }, { x: 2200, y: 193 }, { x: 2650, y: 193 },
    ],
    bouncers: [],
    vents: [],
    movers: [],
    signs: [
      { x: 150, y: 168, text: "ARROWS / A D - MOVE" },
      { x: 640, y: 168, text: "SPACE - JUMP" },
      { x: 1200, y: 136, text: "GRAB HEARTS" },
      { x: 2600, y: 168, text: "ROXY WAITS AHEAD" },
    ],
    checkpoints: [900, 1900],
  },

  // ------------------------------------------------------ 2: NEON ALLEY
  {
    name: "NEON ALLEY",
    width: 3600,
    killY: 420,
    spawn: { x: 40, y: 120 },
    goal: doorAt(3600),
    platforms: [
      { x: 0, y: 208, w: 440, h: 62, neon: "magenta" },
      { x: 512, y: 208, w: 380, h: 62, neon: "magenta" },
      { x: 956, y: 176, w: 356, h: 94, neon: "magenta" },
      { x: 1380, y: 176, w: 560, h: 94, neon: "magenta" },
      { x: 2012, y: 208, w: 360, h: 62, neon: "magenta" },
      { x: 2436, y: 160, w: 316, h: 110, neon: "magenta" },
      { x: 2816, y: 160, w: 340, h: 110, neon: "magenta" },
      { x: 3220, y: 208, w: 380, h: 62, neon: "magenta" },
    ],
    hearts: [
      { x: 200, y: 193 }, { x: 600, y: 193 }, { x: 1100, y: 161 },
      { x: 1500, y: 161 }, { x: 1800, y: 161 }, { x: 2200, y: 193 },
      { x: 2600, y: 145 }, { x: 3000, y: 145 }, { x: 3350, y: 193 },
    ],
    bouncers: [{ x1: 1420, x2: 1880, y: 176, speed: 0.6 }],
    vents: [],
    movers: [],
    signs: [
      { x: 1000, y: 136, text: "MIND THE GAPS" },
      { x: 1400, y: 136, text: "BOUNCER - DON'T TOUCH" },
    ],
    checkpoints: [1100, 2300],
  },

  // ------------------------------------------------------ 3: CLUB FLOOR
  {
    name: "CLUB FLOOR",
    width: 4200,
    killY: 420,
    spawn: { x: 40, y: 120 },
    goal: doorAt(4200),
    platforms: [
      { x: 0, y: 208, w: 420, h: 62, neon: "purple" },
      { x: 492, y: 208, w: 400, h: 62, neon: "purple" },
      { x: 956, y: 176, w: 360, h: 94, neon: "purple" },
      { x: 1380, y: 176, w: 480, h: 94, neon: "purple" },
      { x: 1924, y: 208, w: 380, h: 62, neon: "purple" },
      { x: 2368, y: 160, w: 340, h: 110, neon: "purple" },
      { x: 2772, y: 160, w: 340, h: 110, neon: "purple" },
      { x: 3176, y: 208, w: 380, h: 62, neon: "purple" },
      { x: 3620, y: 208, w: 580, h: 62, neon: "purple" },
    ],
    hearts: [
      { x: 200, y: 193 }, { x: 560, y: 193 }, { x: 1100, y: 161 },
      { x: 1500, y: 161 }, { x: 2050, y: 193 }, { x: 2550, y: 145 },
      { x: 2950, y: 145 }, { x: 3350, y: 193 }, { x: 3900, y: 193 },
      // bonus: above the moving platform
      { x: 1560, y: 60 },
    ],
    bouncers: [
      { x1: 1450, x2: 1800, y: 176, speed: 0.7 },
      { x1: 2820, x2: 3060, y: 160, speed: 0.7 },
    ],
    vents: [
      { x: 640, y: 208, period: 220, onTicks: 100, offset: 0 },
      { x: 2100, y: 208, period: 220, onTicks: 100, offset: 110 },
    ],
    movers: [
      { x1: 1530, y1: 150, x2: 1530, y2: 60, w: 64, speed: 0.7 },
    ],
    signs: [
      { x: 560, y: 168, text: "STEAM - WAIT IT OUT" },
      { x: 2900, y: 120, text: "RAVEN WAITS AHEAD" },
    ],
    checkpoints: [1200, 2600],
  },

  // ------------------------------------------------------ 4: VIP LOUNGE
  {
    name: "VIP LOUNGE",
    width: 4800,
    killY: 420,
    spawn: { x: 40, y: 120 },
    goal: doorAt(4800),
    platforms: [
      { x: 0, y: 208, w: 400, h: 62, neon: "magenta" },
      { x: 472, y: 208, w: 360, h: 62, neon: "magenta" },
      { x: 904, y: 160, w: 320, h: 110, neon: "magenta" },
      { x: 1296, y: 160, w: 420, h: 110, neon: "magenta" },
      { x: 1788, y: 192, w: 340, h: 78, neon: "magenta" },
      { x: 2200, y: 144, w: 320, h: 126, neon: "magenta" },
      { x: 2592, y: 144, w: 400, h: 126, neon: "magenta" },
      { x: 3064, y: 176, w: 340, h: 94, neon: "magenta" },
      { x: 3476, y: 176, w: 360, h: 94, neon: "magenta" },
      { x: 3908, y: 208, w: 400, h: 62, neon: "magenta" },
      { x: 4372, y: 208, w: 428, h: 62, neon: "magenta" },
    ],
    hearts: [
      { x: 200, y: 193 }, { x: 600, y: 193 }, { x: 1050, y: 145 },
      { x: 1450, y: 145 }, { x: 1900, y: 177 }, { x: 2350, y: 129 },
      { x: 2750, y: 129 }, { x: 3200, y: 161 }, { x: 3600, y: 161 },
      { x: 4100, y: 193 }, { x: 4550, y: 193 },
      // bonus above mover
      { x: 2780, y: 40 },
    ],
    bouncers: [
      { x1: 1360, x2: 1660, y: 160, speed: 0.8 },
      { x1: 2650, x2: 2940, y: 144, speed: 0.8 },
    ],
    vents: [
      { x: 600, y: 208, period: 200, onTicks: 95, offset: 0 },
      { x: 1950, y: 192, period: 200, onTicks: 95, offset: 100 },
      { x: 3650, y: 176, period: 200, onTicks: 95, offset: 50 },
    ],
    movers: [
      { x1: 2750, y1: 120, x2: 2750, y2: 40, w: 64, speed: 0.8 },
    ],
    signs: [{ x: 4000, y: 168, text: "ONYX WAITS AHEAD" }],
    checkpoints: [1400, 2800],
  },
];
