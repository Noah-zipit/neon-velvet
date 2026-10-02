// Shared types for NEON VELVET. Pure data — no DOM.

export type ScreenName =
  | "gate"
  | "title"
  | "stages"
  | "game"
  | "cutscene"
  | "gallery"
  | "galleryReplay"
  | "credits";

export interface SaveData {
  adult: boolean;
  mute: boolean;
  unlocked: number; // stages unlocked, 1..4
  gallery: boolean[]; // per dancer
  hearts: number; // lifetime total
}

export const STAGE_NAMES = ["ROOFTOPS", "NEON ALLEY", "CLUB FLOOR", "VIP LOUNGE"] as const;

export interface DancerInfo {
  name: string;
  file: string;
  frameW: number;
  frameH: number;
  frames: number;
  tagline: string;
}

// Stage -> dancer mapping (difficulty order)
export const DANCERS: DancerInfo[] = [
  { name: "ROXY", file: "assets/dancers/1_Uncensored.png", frameW: 96, frameH: 144, frames: 3, tagline: "Queen of the Rooftops" },
  { name: "VIOLET", file: "assets/dancers/2_uncensored.png", frameW: 64, frameH: 96, frames: 32, tagline: "Neon Alley Siren" },
  { name: "RAVEN", file: "assets/dancers/3_UNcensored.png", frameW: 64, frameH: 96, frames: 30, tagline: "Club Floor Temptress" },
  { name: "ONYX", file: "assets/dancers/4_export.png", frameW: 96, frameH: 144, frames: 126, tagline: "The VIP Finale" },
];

export interface PlatformDef {
  x: number; y: number; w: number; h: number;
  neon: "cyan" | "magenta" | "purple";
  oneWay?: boolean;
}

export interface HeartDef { x: number; y: number; taken?: boolean }
export interface BouncerDef { x1: number; x2: number; y: number; speed: number }
export interface VentDef { x: number; y: number; period: number; onTicks: number; offset: number }
export interface MoverDef { x1: number; y1: number; x2: number; y2: number; w: number; speed: number }
export interface SignDef { x: number; y: number; text: string }

export interface LevelDef {
  name: string;
  width: number;
  killY: number;
  spawn: { x: number; y: number };
  goal: { x: number; y: number; w: number; h: number };
  platforms: PlatformDef[];
  hearts: HeartDef[];
  bouncers: BouncerDef[];
  vents: VentDef[];
  movers: MoverDef[];
  signs: SignDef[];
  checkpoints: number[]; // x positions
}

// ---- physics state (pure, headless-testable) ----
export interface BodyState {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  onGround: boolean;
  coyote: number; buffer: number;
  facing: 1 | -1;
  invuln: number;
  dead: boolean;
}

export interface InputState {
  left: boolean; right: boolean;
  jumpHeld: boolean; jumpPressed: boolean; // jumpPressed = edge, consumed by physics
}

export interface SimResult {
  x: number; y: number;
  heartsCollected: number;
  heartsLost: number;
  reachedGoal: boolean;
  ticks: number;
  deaths: number;
  log: string[];
}
