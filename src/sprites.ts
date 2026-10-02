// Hand-authored pixel art for NEON VELVET, typed as pixel maps.
// Player: 24x32 guy in a leather jacket. Tiles: 16x16 neon concrete.
// Bouncer: 20x28 thug (2 frames). Heart: 12x10. Vent: 16x9. Flag: 16x32 (2 frames).
// No AI-generated art. Dancer art comes only from the real PuraPiedr4 strips.

import { px, validateMaps, type PixMap } from "./pixel.ts";

// ---------------------------------------------------------------- player ---
// Head + torso shared by idle/run frames (r0..r20).
const PLAYER_TOP: PixMap = [
  "........................",
  "........kkkkkkkk........",
  "......kkhhhhhhhhkk......",
  ".....khhhhhhhhhhhhk.....",
  ".....khhssssssshhhk.....",
  ".....khseesssseeshk.....",
  ".....khhssssssshhhk.....",
  ".....khhsdssssdshhk.....",
  "......khssssssshhk......",
  ".......kkmmmmmmkk.......",
  ".....kkjjjjjjjjjjkk.....",
  "..kksjjjjjmMMmjjjjjskk..",
  "..kksjjjjjmMMmjjjjjskk..",
  "..kksjjjjjmMMmjjjjjskk..",
  "..kkdjjjjjmMMmjjjjjdkk..",
  ".....kjjjjjjjjjjjjk.....",
  ".....kjjjjjjjjjjjjk.....",
  "......kjjjjjjjjjjk......",
  "......kkkkkkkkkkkk......",
  "......kppppppppppk......",
  "......kppppppppppk......",
];

// Arms raised (jump frame) — replaces rows 11..14 of PLAYER_TOP.
const PLAYER_ARMS_UP: PixMap = [
  "..kksjjjjjmMMmjjjjjskk..",
  ".skksjjjjjmMMmjjjjjskks.",
  ".skksjjjjjmMMmjjjjjskks.",
  ".dkkdjjjjjmMMmjjjjjdkkd.",
];

const LEGS_IDLE: PixMap = [
  "......kppk....kppk......",
  "......kppk....kppk......",
  "......kppk....kppk......",
  "......kppk....kppk......",
  "......kddk....kddk......",
  "......kbbk....kbbk......",
  "......kbbk....kbbk......",
  ".....kkbbbk..kkbbbkk....",
  ".....kbbbbk..kbbbbk.....",
  ".....kbbbbk..kbbbbk.....",
  ".....kkkkkk..kkkkkk.....",
];

const LEGS_RUN_A: PixMap = [
  "......kppk....kppk......",
  ".....kppk......kppk.....",
  ".....kppk......kppk.....",
  ".....kddk......kddk.....",
  "....kbbbk......kbbbk....",
  "....kbbbk......kbbbk....",
  "....kbbbk......kbbbk....",
  "...kkbbbkk....kkbbbkk...",
  "...kbbbbbk....kbbbbbk...",
  "...kbbbbbk....kbbbbbk...",
  "...kkkkkkk....kkkkkkk...",
];

const LEGS_RUN_B: PixMap = [
  "........kppkkppk........",
  "........kppkkppk........",
  "........kppkkppk........",
  "........kddkkddk........",
  "........kbbkkbbk........",
  "........kbbk..kbbk......",
  ".......kbbbk..kbbbk.....",
  ".......kbbbk..kbbbk.....",
  ".......kbbbk..kbbbk.....",
  ".......kbbbk..kbbbk.....",
  ".......kkkkk..kkkkk.....",
];

const LEGS_JUMP: PixMap = [
  "......kppk....kppk......",
  "......kppk....kppk......",
  "........kppkkppk........",
  "........kddkkddk........",
  ".......kbbbkbbbk........",
  ".......kbbbkbbbk........",
  ".......kbbbkbbbk........",
  "......kkbbbkkbbbkk......",
  "......kbbbbkbbbbk.......",
  "......kbbbbkbbbbk.......",
  "......kkkkkkkkkkk.......",
];

function playerFrame(top: PixMap, legs: PixMap): HTMLCanvasElement {
  return px([...top, ...legs]);
}

function withArmsUp(): PixMap {
  const top = [...PLAYER_TOP];
  top.splice(11, 4, ...PLAYER_ARMS_UP);
  return top;
}

export const sprPlayerIdle = () => playerFrame(PLAYER_TOP, LEGS_IDLE);
export const sprPlayerRunA = () => playerFrame(PLAYER_TOP, LEGS_RUN_A);
export const sprPlayerRunB = () => playerFrame(PLAYER_TOP, LEGS_RUN_B);
export const sprPlayerJump = () => playerFrame(withArmsUp(), LEGS_JUMP);

// ----------------------------------------------------------------- tiles ---
// 16x16 neon-edged concrete tile. Palette-swapped for magenta/purple variants.
const TILE_TOP: PixMap = [
  "nnnnnnnnnnnnnnnn",
  "NNNNNNNNNNNNNNNN",
  "nnnnnnnnnnnnnnnn",
  "cccccccccccccccc",
  "cCccCccccccCccCc",
  "cccccccccccccccc",
  "ccCccccccCccccCc",
  "cccccccccccccccc",
  "cCccccCccccccCcc",
  "cccccccccccccccc",
  "ccccCccccccCcccc",
  "cccccccccccccccc",
  "cCccCccccccCccCc",
  "cccccccccccccccc",
  "DDDDDDDDDDDDDDDD",
  "DDDDDDDDDDDDDDDD",
];

const TILE_BODY: PixMap = [
  "cccccccccccccccc",
  "cCccCccccccCccCc",
  "cccccccccccccccc",
  "ccCccccccCccccCc",
  "cccccccccccccccc",
  "cCccccCccccccCcc",
  "cccccccccccccccc",
  "ccccCccccccCcccc",
  "cccccccccccccccc",
  "cCccCccccccCccCc",
  "cccccccccccccccc",
  "DDDDDDDDDDDDDDDD",
  "DDDDDDDDDDDDDDDD",
  "DDDDDDDDDDDDDDDD",
  "DDDDDDDDDDDDDDDD",
  "DDDDDDDDDDDDDDDD",
];

function swapNeon(map: PixMap, edge: string, dim: string): PixMap {
  return map.map((row) =>
    row.replaceAll("n", edge).replaceAll("N", dim)
  );
}

export const sprTileCyan = () => px(TILE_TOP, "tile-top-cyan");
export const sprTileMagenta = () =>
  px(swapNeon(TILE_TOP, "m", "M"), "tile-top-magenta");
export const sprTilePurple = () =>
  px(swapNeon(TILE_TOP, "u", "U"), "tile-top-purple");
export const sprTileBody = () => px(TILE_BODY, "tile-body");

// ----------------------------------------------------------------- heart ---
const HEART: PixMap = [
  "..kk....kk..",
  ".krrk..krrk.",
  "krrrrkkrrrrk",
  "kRrrrrrrrrrk",
  "krrrrrrrrrrk",
  ".krrrrrrrrk.",
  "..krrrrrrk..",
  "...krrrrk...",
  "....krrk....",
  ".....kk.....",
];
export const sprHeart = () => px(HEART, "heart");

// ---------------------------------------------------------------- bouncer ---
const BOUNCER_TOP: PixMap = [
  ".....kkkkkkkkkk.....",
  "....kssssssssssk....",
  "....kssssssssssk....",
  "....kkeeekkeeekk....",
  "....kkeeekkeeekk....",
  "....kssssssssssk....",
  "....kssdddddsssk....",
  ".....kkkkkkkkkk.....",
  "....kkkkkkkkkkkk....",
  "..kkGGGGGGGGGGGGkk..",
  "..kGGGGwwwwwwGGGGk..",
  "..kGGGGwwwwwwGGGGk..",
  "..kGGGGwwwwwwGGGGk..",
  "..kGGGGwwwwwwGGGGk..",
  "..kGGGGwwwwwwGGGGk..",
  "..kGGgGwwwwwwGgGGk..",
  "..kGGgGwwwwwwGgGGk..",
  "..kGGsGwwwwwwGsGGk..",
  "..kkGGGGGGGGGGGGkk..",
  "....kGGGGGGGGGGk....",
];

const BOUNCER_LEGS_A: PixMap = [
  "....kGGGk..kGGGk....",
  "....kGGGk..kGGGk....",
  "....kGGGk..kGGGk....",
  "....kDDDk..kDDDk....",
  "...kkDDDkkkkDDDkk...",
  "...kDDDDDkkDDDDDk...",
  "...kkkkkk..kkkkkk...",
  "...kkkkkk..kkkkkk...",
];

const BOUNCER_LEGS_B: PixMap = [
  "....kGGGkkGGGk......",
  "....kGGGk.kGGGk.....",
  ".....kGGk.kGGk......",
  ".....kDDk..kDDk.....",
  "....kkDDDkkDDDkk....",
  "...kDDDDDkkDDDDDk...",
  "...kkkkkk..kkkkkk...",
  "...kkkkkk..kkkkkk...",
];

export const sprBouncerA = () => px([...BOUNCER_TOP, ...BOUNCER_LEGS_A], "bouncer-a");
export const sprBouncerB = () => px([...BOUNCER_TOP, ...BOUNCER_LEGS_B], "bouncer-b");

// ------------------------------------------------------------------- vent ---
const VENT: PixMap = [
  "vvvvvvvvvvvvvvvv",
  "vVVVVVVVVVVVVVVv",
  "vVkkkkVVVVkkkkVv",
  "vVkkkkVVVVkkkkVv",
  "vVVVVVVVVVVVVVVv",
  "vVkkkkVVVVkkkkVv",
  "vVkkkkVVVVkkkkVv",
  "vVVVVVVVVVVVVVVv",
  "vvvvvvvvvvvvvvvv",
];
export const sprVent = () => px(VENT, "vent");

// ------------------------------------------------------- checkpoint flag ---
const FLAG_POLE: PixMap = Array.from({ length: 32 }, () => "...kk............");

const FLAG_A: PixMap = [
  "...kknnnnnnnn....",
  "...kknNNNNNNNn...",
  "...kknnnnnnnn....",
  "...kkNNNnn.......",
  "...kknnnn........",
  "...kk............",
];
const FLAG_B: PixMap = [
  "...kknnnnnn......",
  "...kknNNNNNnn....",
  "...kknnnnnnnn....",
  "...kkNNnnnn......",
  "...kknnnn........",
  "...kk............",
];

function flagFrame(wave: PixMap): PixMap {
  // Wave rows already include the pole at cols 3-4; splice them over the pole.
  const rows = [...FLAG_POLE];
  for (let i = 0; i < wave.length; i++) rows[1 + i] = wave[i];
  return rows;
}

export const sprFlagA = () => px(flagFrame(FLAG_A), "flag-a");
export const sprFlagB = () => px(flagFrame(FLAG_B), "flag-b");

// --------------------------------------------------------------- sign -----
// Sign board; "!" glyph + text drawn in code over the board at render time.
const SIGN_FIXED: PixMap = [
  "......kk......",
  "......kk......",
  "......kk......",
  "......kk......",
  "..kkkkkkkkkk..",
  "..kCCCCCCCCk..",
  "..kCwwCCCCCk..",
  "..kCCCCCCCCk..",
  "..kCCCCCCCCk..",
  "..kkkkkkkkkk..",
  "......kk......",
  "......kk......",
  "......kk......",
  "......kk......",
];
export const sprSign = () => px(SIGN_FIXED, "sign");

/** All maps, for node-side validation (no DOM needed). */
export function allMaps(): Record<string, PixMap> {
  return {
    PLAYER_TOP,
    LEGS_IDLE,
    LEGS_RUN_A,
    LEGS_RUN_B,
    LEGS_JUMP,
    TILE_TOP,
    TILE_BODY,
    HEART,
    BOUNCER_TOP,
    BOUNCER_LEGS_A,
    BOUNCER_LEGS_B,
    VENT,
    FLAG_POLE,
    FLAG_A,
    FLAG_B,
    SIGN_FIXED,
  };
}

export function validateAllMaps(): string[] {
  return validateMaps(allMaps());
}
