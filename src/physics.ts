// Pure platformer physics + world simulation. No DOM, no canvas —
// this module runs headless in node for verification AND drives the game.

import type {
  BodyState, BouncerDef, InputState, LevelDef, SimResult,
} from "./types.ts";

export const PHYS = {
  RUN: 2.5,
  ACC_G: 0.7,
  ACC_A: 0.45,
  FRIC: 0.78,
  GRAV: 0.55,
  MAXFALL: 8.5,
  JUMP_V: 10.4,
  JUMP_CUT: -3.5, // release jump -> clamp rise velocity
  COYOTE: 6,
  BUFFER: 8,
  HIT_W: 16,
  HIT_H: 30,
} as const;

export interface Rect { x: number; y: number; w: number; h: number }

export interface World {
  level: LevelDef;
  body: BodyState;
  tick: number;
  heartsTaken: boolean[];
  hearts: number; // collected this run
  heartsLost: number;
  bouncerX: number[];
  bouncerDir: number[];
  moverPos: { x: number; y: number }[];
  moverPrev: { x: number; y: number }[];
  standingMover: number; // -1 none
  checkpointIdx: number; // -1 = spawn
  deaths: number;
  reachedGoal: boolean;
  events: string[]; // drained by the game layer for sfx
}

export function createWorld(level: LevelDef): World {
  return {
    level,
    body: {
      x: level.spawn.x, y: level.spawn.y,
      w: PHYS.HIT_W, h: PHYS.HIT_H,
      vx: 0, vy: 0, onGround: false,
      coyote: 0, buffer: 0, facing: 1, invuln: 0, dead: false,
    },
    tick: 0,
    heartsTaken: level.hearts.map(() => false),
    hearts: 0,
    heartsLost: 0,
    bouncerX: level.bouncers.map((b) => b.x1),
    bouncerDir: level.bouncers.map(() => 1),
    moverPos: level.movers.map((m) => ({ x: m.x1, y: m.y1 })),
    moverPrev: level.movers.map((m) => ({ x: m.x1, y: m.y1 })),
    standingMover: -1,
    checkpointIdx: -1,
    deaths: 0,
    reachedGoal: false,
    events: [],
  };
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Current solid rects: static platforms + movers. */
export function solids(w: World): Rect[] {
  const rects: Rect[] = w.level.platforms.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h }));
  w.level.movers.forEach((m, i) => {
    rects.push({ x: w.moverPos[i].x, y: w.moverPos[i].y, w: m.w, h: 12 });
  });
  return rects;
}

/** Point query against solids (for the autopilot / AI). */
export function solidAt(w: World, x: number, y: number): boolean {
  const r = solids(w);
  for (const s of r) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

function pingpong(t: number, len: number): number {
  const c = ((t % (2 * len)) + 2 * len) % (2 * len);
  return c < len ? c / len : 2 - c / len;
}

function updateMovers(w: World) {
  w.level.movers.forEach((m, i) => {
    w.moverPrev[i] = { ...w.moverPos[i] };
    const dx = m.x2 - m.x1;
    const dy = m.y2 - m.y1;
    const len = Math.hypot(dx, dy) || 1;
    const d = pingpong(w.tick * m.speed, len) * len;
    w.moverPos[i] = { x: m.x1 + (dx / len) * d, y: m.y1 + (dy / len) * d };
  });
}

function updateBouncers(w: World) {
  w.level.bouncers.forEach((b: BouncerDef, i: number) => {
    const span = b.x2 - b.x1;
    if (span <= 0) return;
    const prev = w.bouncerX[i];
    w.bouncerX[i] = b.x1 + pingpong(w.tick * b.speed, span) * span;
    w.bouncerDir[i] = w.bouncerX[i] >= prev ? 1 : -1;
  });
}

function respawn(w: World) {
  const cp = w.checkpointIdx >= 0 ? w.level.checkpoints[w.checkpointIdx] : w.level.spawn.x;
  const b = w.body;
  b.x = cp;
  b.y = w.level.spawn.y;
  b.vx = 0; b.vy = 0;
  b.onGround = false; b.coyote = 0; b.buffer = 0;
  b.invuln = 60;
  w.standingMover = -1;
}

function hurt(w: World, dir: 1 | -1) {
  const b = w.body;
  if (b.invuln > 0) return;
  b.invuln = 90;
  const lost = Math.min(5, w.hearts);
  w.hearts -= lost;
  w.heartsLost += lost;
  b.vx = 4.5 * dir;
  b.vy = -6.5;
  b.onGround = false;
  w.standingMover = -1;
  w.events.push("hurt");
}

export function stepWorld(w: World, input: InputState): void {
  const b = w.body;
  const P = PHYS;
  w.tick++;
  w.events.length = 0;
  if (w.reachedGoal) return;

  updateMovers(w);
  updateBouncers(w);

  // ride moving platform
  if (w.standingMover >= 0) {
    const i = w.standingMover;
    b.x += w.moverPos[i].x - w.moverPrev[i].x;
    b.y += w.moverPos[i].y - w.moverPrev[i].y;
  }

  // --- horizontal
  const acc = b.onGround ? P.ACC_G : P.ACC_A;
  if (input.left && !input.right) {
    b.vx = Math.max(-P.RUN, b.vx - acc);
    b.facing = -1;
  } else if (input.right && !input.left) {
    b.vx = Math.min(P.RUN, b.vx + acc);
    b.facing = 1;
  } else if (b.onGround) {
    b.vx *= P.FRIC;
    if (Math.abs(b.vx) < 0.05) b.vx = 0;
  } else {
    b.vx *= 0.995;
  }

  // --- jump buffering / coyote
  if (input.jumpPressed) b.buffer = P.BUFFER;
  else if (b.buffer > 0) b.buffer--;
  if (b.onGround) b.coyote = P.COYOTE;
  else if (b.coyote > 0) b.coyote--;
  if (b.buffer > 0 && (b.onGround || b.coyote > 0)) {
    b.vy = -P.JUMP_V;
    b.buffer = 0;
    b.coyote = 0;
    b.onGround = false;
    w.standingMover = -1;
    w.events.push("jump");
  }
  // variable jump height
  if (!input.jumpHeld && b.vy < P.JUMP_CUT) b.vy = P.JUMP_CUT;

  // --- integrate X + collide
  b.x += b.vx;
  {
    const rects = solids(w);
    for (const s of rects) {
      if (overlap(b, s)) {
        if (b.vx > 0) b.x = s.x - b.w;
        else if (b.vx < 0) b.x = s.x + s.w;
        b.vx = 0;
      }
    }
  }
  if (b.x < 0) { b.x = 0; b.vx = 0; }
  if (b.x + b.w > w.level.width) { b.x = w.level.width - b.w; b.vx = 0; }

  // --- integrate Y + collide
  b.vy = Math.min(P.MAXFALL, b.vy + P.GRAV);
  b.y += b.vy;
  {
    const wasGround = b.onGround;
    b.onGround = false;
    const rects = solids(w);
    const platCount = rects.length - w.level.movers.length;
    for (let i = 0; i < rects.length; i++) {
      const s = rects[i];
      if (overlap(b, s)) {
        if (b.vy > 0) {
          b.y = s.y - b.h;
          b.vy = 0;
          b.onGround = true;
          w.standingMover = i >= platCount ? i - platCount : -1;
        } else if (b.vy < 0) {
          b.y = s.y + s.h;
          b.vy = 0;
        }
      }
    }
    if (!wasGround && b.onGround) w.events.push("land");
  }

  if (b.invuln > 0) b.invuln--;

  // --- hearts
  w.level.hearts.forEach((h, i) => {
    if (w.heartsTaken[i]) return;
    const hr: Rect = { x: h.x - 6, y: h.y - 5, w: 12, h: 10 };
    if (overlap(b, hr)) {
      w.heartsTaken[i] = true;
      w.hearts++;
      w.events.push("collect");
    }
  });

  // --- bouncers
  w.level.bouncers.forEach((bnc, i) => {
    const r: Rect = { x: w.bouncerX[i] - 10, y: bnc.y - 28, w: 20, h: 28 };
    if (overlap(b, r)) {
      const dir: 1 | -1 = b.x + b.w / 2 < r.x + r.w / 2 ? -1 : 1;
      hurt(w, dir);
    }
  });

  // --- steam vents
  w.level.vents.forEach((v) => {
    const active = (w.tick + v.offset) % v.period < v.onTicks;
    if (!active) return;
    const r: Rect = { x: v.x, y: v.y - 34, w: 16, h: 34 };
    if (overlap(b, r)) {
      const dir: 1 | -1 = b.x + b.w / 2 < v.x + 8 ? -1 : 1;
      hurt(w, dir);
    }
  });

  // --- checkpoints
  w.level.checkpoints.forEach((cx, i) => {
    if (i > w.checkpointIdx && b.x + b.w / 2 > cx) {
      w.checkpointIdx = i;
      w.events.push("checkpoint");
    }
  });

  // --- goal
  const g = w.level.goal;
  if (overlap(b, g)) {
    w.reachedGoal = true;
    w.events.push("goal");
  }

  // --- fall
  if (b.y > w.level.killY) {
    w.deaths++;
    w.hearts = Math.max(0, w.hearts - 3);
    w.heartsLost += 3;
    w.events.push("death");
    respawn(w);
  }
}

/** Run a scripted/autopilot playthrough; used by the node sim. */
export function simulate(
  level: LevelDef,
  driver: (w: World) => InputState,
  maxTicks = 60 * 90,
): SimResult {
  const w = createWorld(level);
  const log: string[] = [];
  let lastX = w.body.x;
  let stuckTicks = 0;
  for (let t = 0; t < maxTicks; t++) {
    const input = driver(w);
    stepWorld(w, input);
    for (const e of w.events) {
      if (e === "goal" || e === "death" || e === "checkpoint") log.push(`t${t}:${e}`);
    }
    if (w.reachedGoal) break;
    if (Math.abs(w.body.x - lastX) < 0.5) stuckTicks++;
    else { stuckTicks = 0; lastX = w.body.x; }
    if (stuckTicks > 600) { log.push(`t${t}:STUCK x=${w.body.x.toFixed(0)}`); break; }
    if (!Number.isFinite(w.body.x) || !Number.isFinite(w.body.y)) {
      log.push(`t${t}:NONFINITE`); break;
    }
  }
  return {
    x: w.body.x, y: w.body.y,
    heartsCollected: w.hearts,
    heartsLost: w.heartsLost,
    reachedGoal: w.reachedGoal,
    ticks: w.tick,
    deaths: w.deaths,
    log,
  };
}
