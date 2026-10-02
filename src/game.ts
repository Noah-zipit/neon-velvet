// Gameplay: fixed-timestep simulation (physics.ts) + canvas rendering.
// Parallax: real Sprite.png street (far) + 2 code-drawn layers (rooftop
// silhouettes, neon signs). Platforms from hand-authored tile maps.

import { GameAudio } from "./audio.ts";
import { Input } from "./input.ts";
import { LEVELS } from "./level.ts";
import {
  createWorld, stepWorld, type World,
} from "./physics.ts";
import {
  sprBouncerA, sprBouncerB, sprFlagA, sprFlagB, sprHeart,
  sprPlayerIdle, sprPlayerJump, sprPlayerRunA, sprPlayerRunB,
  sprSign, sprTileBody, sprTileCyan, sprTileMagenta, sprTilePurple, sprVent,
} from "./sprites.ts";
import type { SaveData } from "./types.ts";
import { dimText, drawButton, hitButton, neonText, panel, type Button } from "./ui.ts";

const W = 480;
const H = 270;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number }
interface SignPost { x: number; label: string; color: string }
interface RoofBlock { x: number; w: number; h: number; windows: { x: number; y: number }[] }

const BASE = import.meta.env?.BASE_URL || "./";
function asset(p: string) {
  const b = BASE.endsWith("/") ? BASE : BASE + "/";
  return b + p;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export class Gameplay {
  world: World | null = null;
  stageIdx = 0;
  paused = false;
  pauseButtons: Button[] = [];
  runHearts = 0;

  private street: HTMLImageElement | null = null;
  private loaded = false;
  private camX = 0;
  private camY = 0;
  private shake = 0;
  private particles: Particle[] = [];
  private roofs: RoofBlock[] = [];
  private signs: SignPost[] = [];
  private stars: { x: number; y: number; r: number }[] = [];
  private platformCache = new Map<number, HTMLCanvasElement>();
  private vignette: HTMLCanvasElement | null = null;
  private steamAcc = 0;
  private touchWasOn = false;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private audio: GameAudio;
  private save: SaveData;

  constructor(
    ctx: CanvasRenderingContext2D,
    input: Input,
    audio: GameAudio,
    save: SaveData,
  ) {
    this.ctx = ctx;
    this.input = input;
    this.audio = audio;
    this.save = save;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    // Warm the hand-authored sprite cache.
    sprPlayerIdle(); sprPlayerRunA(); sprPlayerRunB(); sprPlayerJump();
    sprBouncerA(); sprBouncerB(); sprHeart(); sprVent();
    sprFlagA(); sprFlagB(); sprSign();
    sprTileCyan(); sprTileMagenta(); sprTilePurple(); sprTileBody();
    this.street = await loadImg(asset("assets/dancers/Sprite.png"));
    this.vignette = this.makeVignette();
    this.loaded = true;
  }

  private makeVignette(): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d")!;
    const grad = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(5,2,16,0.55)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    return cv;
  }

  startStage(idx: number) {
    this.stageIdx = idx;
    this.world = createWorld(LEVELS[idx]);
    this.paused = false;
    this.runHearts = 0;
    this.particles = [];
    this.platformCache.clear();
    const rnd = mulberry32(1234 + idx * 777);
    const level = LEVELS[idx];
    // rooftop silhouettes (mid parallax)
    this.roofs = [];
    let rx = 0;
    while (rx < level.width * 0.5 + 400) {
      const bw = 90 + rnd() * 160;
      const bh = 60 + rnd() * 110;
      const wins: { x: number; y: number }[] = [];
      const n = Math.floor(rnd() * 8);
      for (let i = 0; i < n; i++) {
        wins.push({ x: 8 + rnd() * (bw - 16), y: 10 + rnd() * (bh - 24) });
      }
      this.roofs.push({ x: rx, w: bw, h: bh, windows: wins });
      rx += bw + 20 + rnd() * 90;
    }
    // neon signs (near parallax)
    const labels = ["XXX", "BAR", "24H", "CLUB", "GIRLS GIRLS", "VELVET", "OPEN", "NEON"];
    const colors = ["#ff2a82", "#00e5ff", "#b44dff", "#ff2a82", "#00e5ff"];
    this.signs = [];
    rx = 120;
    while (rx < level.width * 0.75 + 300) {
      this.signs.push({
        x: rx,
        label: labels[Math.floor(rnd() * labels.length)],
        color: colors[Math.floor(rnd() * colors.length)],
      });
      rx += 260 + rnd() * 420;
    }
    // stars
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: rnd() * W, y: rnd() * 150, r: rnd() < 0.8 ? 1 : 2 });
    }
    this.camX = 0;
    this.camY = 0;
    this.audio.startMusic();
  }

  /** One fixed 60Hz tick. Returns "goal" on the tick the goal is reached. */
  update(): "playing" | "goal" {
    if (!this.world || this.paused) return "playing";
    this.input.poll();
    if (this.input.consumePause()) {
      this.audio.sfx("click");
      this.setPaused(true);
      return "playing";
    }
    if (this.input.consumeMuteToggle()) {
      this.save.mute = !this.save.mute;
      this.audio.setMuted(this.save.mute);
    }
    const before = this.world.hearts;
    stepWorld(this.world, this.input.state);
    // wire events -> sfx + particles
    for (const e of this.world.events) {
      if (e === "jump") this.audio.sfx("jump");
      else if (e === "collect") {
        this.audio.sfx("collect");
        this.burst(this.world.body.x + 8, this.world.body.y + 6, "#ff3d6e", 10);
      } else if (e === "hurt") {
        this.audio.sfx("hurt");
        this.shake = 8;
        this.burst(this.world.body.x + 8, this.world.body.y + 12, "#ff2a82", 14);
      } else if (e === "checkpoint") {
        this.audio.sfx("checkpoint");
        this.burst(this.world.body.x + 8, this.world.body.y, "#00e5ff", 12);
      } else if (e === "death") {
        this.audio.sfx("hurt");
        this.shake = 10;
      } else if (e === "goal") {
        this.audio.sfx("goal");
      } else if (e === "land") {
        this.burst(this.world.body.x + 8, this.world.body.y + 30, "#4a3a7a", 5);
      }
    }
    if (this.world.hearts > before) this.runHearts += this.world.hearts - before;
    if (this.world.reachedGoal) return "goal";
    // camera
    const b = this.world.body;
    const targetX = Math.min(Math.max(b.x + b.w / 2 - W / 2, 0), this.world.level.width - W);
    this.camX += (targetX - this.camX) * 0.12;
    const targetY = Math.max(-14, Math.min(14, b.vy * 1.6));
    this.camY += (targetY - this.camY) * 0.08;
    if (this.shake > 0) this.shake *= 0.88;
    this.updateParticles();
    this.updateSteam();
    return "playing";
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 1.8;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8,
        life: 0, max: 24 + Math.random() * 20,
        color, size: Math.random() < 0.5 ? 1 : 2, grav: 0.06,
      });
    }
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.life++;
      p.x += p.vx; p.y += p.vy; p.vy += p.grav;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  private updateSteam() {
    if (!this.world) return;
    this.steamAcc++;
    for (const v of this.world.level.vents) {
      const active = (this.world.tick + v.offset) % v.period < v.onTicks;
      if (active && this.steamAcc % 3 === 0) {
        this.particles.push({
          x: v.x + 3 + Math.random() * 10, y: v.y - 6,
          vx: (Math.random() - 0.5) * 0.4, vy: -1.2 - Math.random(),
          life: 0, max: 40 + Math.random() * 20,
          color: "rgba(200,220,255,0.5)", size: 2, grav: -0.01,
        });
      }
    }
  }

  setPaused(p: boolean) {
    this.paused = p;
    // hide touch controls under the pause menu (touch devices only)
    const touchEl = document.getElementById("touch");
    if (touchEl) {
      if (p && touchEl.classList.contains("on")) {
        touchEl.classList.remove("on");
        this.touchWasOn = true;
      } else if (!p && this.touchWasOn) {
        touchEl.classList.add("on");
        this.touchWasOn = false;
      }
    }
    if (p) {
      const cx = W / 2;
      this.pauseButtons = [
        { id: "resume", x: cx - 90, y: 92, w: 180, h: 30, label: "RESUME", color: "#00e5ff" },
        { id: "restart", x: cx - 90, y: 130, w: 180, h: 30, label: "RESTART", color: "#b44dff" },
        { id: "mute", x: cx - 90, y: 168, w: 180, h: 30, label: this.save.mute ? "SOUND: OFF" : "SOUND: ON", color: "#8f86b8" },
        { id: "quit", x: cx - 90, y: 206, w: 180, h: 30, label: "QUIT TO TITLE", color: "#ff2a82" },
      ];
    }
  }

  tapPause(x: number, y: number): string | null {
    if (!this.paused) return null;
    for (const b of this.pauseButtons) {
      if (hitButton(b, x, y)) return `pause-${b.id}`;
    }
    return null;
  }

  // --------------------------------------------------------------- render ---
  render(t: number) {
    const ctx = this.ctx;
    const w = this.world;
    if (!w) return;
    ctx.save();
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.translate(-Math.round(this.camX + sx), -Math.round(this.camY + sy));

    this.drawSky(ctx);
    this.drawStreet(ctx);
    this.drawRoofs(ctx);
    this.drawNeonSigns(ctx, t);

    for (const p of w.level.platforms) this.drawPlatform(ctx, p);
    for (let mi = 0; mi < w.level.movers.length; mi++) this.drawMover(ctx, mi);
    this.drawCheckpoints(ctx, t, w);
    this.drawSigns(ctx, w);
    this.drawGoal(ctx, t, w);
    this.drawHearts(ctx, t, w);
    this.drawVents(ctx, w);
    this.drawBouncers(ctx, t, w);
    this.drawPlayer(ctx, t, w);
    this.drawParticles(ctx);

    ctx.restore();

    // screen-space
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0);
    this.drawHUD(ctx, w);
    if (this.paused) this.drawPauseMenu(ctx, t);
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#070313");
    g.addColorStop(0.6, "#120826");
    g.addColorStop(1, "#1d0b33");
    ctx.fillStyle = g;
    ctx.fillRect(this.camX - 20, -40, W + 40, H + 80);
    ctx.fillStyle = "#cfe8ff";
    for (const s of this.stars) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.x * 3);
      ctx.fillRect(this.camX + s.x - 20, s.y - 20, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // moon
    ctx.save();
    ctx.shadowColor = "#f4e9ff"; ctx.shadowBlur = 24;
    ctx.fillStyle = "#e8dcff";
    ctx.beginPath();
    ctx.arc(this.camX + 400, 44, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawStreet(ctx: CanvasRenderingContext2D) {
    if (!this.street) return;
    // The source image is ~60% black sky on top; crop to the building band
    // and place it as a small distant skyline behind the nearer layers.
    const sh = this.street.height;
    const srcY = sh * 0.42;
    const srcH = sh - srcY;
    const dh = 120;
    const dw = (this.street.width / srcH) * dh;
    const par = 0.25;
    const off = -((this.camX * par) % dw);
    const dy = 72;
    for (let x = off - dw; x < this.camX + W + dw; x += dw) {
      ctx.drawImage(this.street, 0, srcY, this.street.width, srcH, x, dy, dw, dh);
    }
  }

  private drawRoofs(ctx: CanvasRenderingContext2D) {
    const par = 0.5;
    const baseY = 208;
    for (const r of this.roofs) {
      const x = r.x - this.camX * par;
      if (x + r.w < this.camX - 60 || x > this.camX + W + 60) continue;
      ctx.fillStyle = "#0d0718";
      ctx.fillRect(x, baseY - r.h, r.w, r.h + 80);
      // antenna
      ctx.fillRect(x + r.w / 2 - 1, baseY - r.h - 18, 2, 18);
      ctx.fillStyle = "#ff2a82";
      ctx.fillRect(x + r.w / 2 - 1, baseY - r.h - 20, 2, 2);
      // lit windows
      ctx.fillStyle = "rgba(255,214,120,0.5)";
      for (const win of r.windows) ctx.fillRect(x + win.x, baseY - r.h + win.y, 5, 7);
      // neon rim
      ctx.fillStyle = "rgba(0,229,255,0.35)";
      ctx.fillRect(x, baseY - r.h, r.w, 2);
    }
  }

  private drawNeonSigns(ctx: CanvasRenderingContext2D, t: number) {
    const par = 0.75;
    for (const s of this.signs) {
      const x = s.x - this.camX * par;
      if (x < this.camX - 80 || x > this.camX + W + 80) continue;
      const flicker = Math.sin(t / 130 + s.x) > 0.96 ? 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = 0.9 * flicker;
      ctx.fillStyle = "#0a0512";
      ctx.fillRect(x - 4, 60, 64, 30);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = flicker;
      neonText(ctx, s.label, x + 28, 76, 11, s.color, "center", 10);
      ctx.restore();
      ctx.fillStyle = "#141021";
      ctx.fillRect(x + 26, 90, 4, 130);
    }
  }

  private tileSprite(neon: string): HTMLCanvasElement {
    return neon === "magenta" ? sprTileMagenta() : neon === "purple" ? sprTilePurple() : sprTileCyan();
  }

  private drawPlatform(ctx: CanvasRenderingContext2D, p: { x: number; y: number; w: number; h: number; neon: string }) {
    if (p.x + p.w < this.camX - 40 || p.x > this.camX + W + 40) return;
    const key = p.x * 100000 + p.y * 10 + p.w;
    let cv = this.platformCache.get(key);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = p.w; cv.height = p.h;
      const g = cv.getContext("2d")!;
      const top = this.tileSprite(p.neon);
      for (let x = 0; x < p.w; x += 16) {
        const sw = Math.min(16, p.w - x);
        g.drawImage(top, 0, 0, sw, 16, x, 0, sw, 16);
      }
      const body = sprTileBody();
      for (let y = 16; y < p.h; y += 16) {
        for (let x = 0; x < p.w; x += 16) {
          const sw = Math.min(16, p.w - x);
          const sh = Math.min(16, p.h - y);
          g.drawImage(body, 0, 0, sw, sh, x, y, sw, sh);
        }
      }
      this.platformCache.set(key, cv);
    }
    ctx.drawImage(cv, p.x, p.y);
  }

  private drawMover(ctx: CanvasRenderingContext2D, mi: number) {
    if (!this.world) return;
    const m = this.world.level.movers[mi];
    const pos = this.world.moverPos[mi];
    if (!pos) return;
    const top = sprTilePurple();
    for (let x = 0; x < m.w; x += 16) {
      const sw = Math.min(16, m.w - x);
      ctx.drawImage(top, 0, 0, sw, 12, pos.x + x, pos.y, sw, 12);
    }
    ctx.fillStyle = "#141021";
    ctx.fillRect(pos.x, pos.y + 12, m.w, 4);
    // glow dots underneath
    ctx.fillStyle = "rgba(180,77,255,0.5)";
    ctx.fillRect(pos.x + 4, pos.y + 12, m.w - 8, 2);
  }

  private drawCheckpoints(ctx: CanvasRenderingContext2D, t: number, w: World) {
    w.level.checkpoints.forEach((cx, i) => {
      if (cx < this.camX - 40 || cx > this.camX + W + 40) return;
      const gy = this.groundYAt(w, cx);
      const spr = Math.floor(t / 400) % 2 === 0 ? sprFlagA() : sprFlagB();
      const reached = i <= w.checkpointIdx;
      if (reached) {
        ctx.save();
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 10;
        ctx.drawImage(spr, cx - 8, gy - 32, 16, 32);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(spr, cx - 8, gy - 32, 16, 32);
        ctx.restore();
      }
    });
  }

  private groundYAt(w: World, x: number): number {
    let best = 300;
    for (const p of w.level.platforms) {
      if (x >= p.x && x <= p.x + p.w && p.y < best) best = p.y;
    }
    return best;
  }

  private drawSigns(ctx: CanvasRenderingContext2D, w: World) {
    for (const s of w.level.signs) {
      if (s.x < this.camX - 60 || s.x > this.camX + W + 60) continue;
      const gy = this.groundYAt(w, s.x);
      ctx.drawImage(sprSign(), s.x - 7, gy - 28, 14, 28);
      dimText(ctx, s.text, s.x, gy - 36, 8, "#9fd8ff");
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D, t: number, w: World) {
    const g = w.level.goal;
    if (g.x < this.camX - 80 || g.x > this.camX + W + 80) return;
    const pulse = 0.6 + 0.4 * Math.sin(t / 240);
    ctx.save();
    // doorway
    ctx.fillStyle = "#08040f";
    ctx.fillRect(g.x, g.y, g.w, g.h);
    // warm light inside, animated
    const lg = ctx.createLinearGradient(g.x, g.y + g.h, g.x, g.y);
    lg.addColorStop(0, `rgba(255,42,130,${0.35 * pulse})`);
    lg.addColorStop(1, "rgba(255,42,130,0.02)");
    ctx.fillStyle = lg;
    ctx.fillRect(g.x + 3, g.y + 3, g.w - 6, g.h - 3);
    // neon frame
    ctx.strokeStyle = "#ff2a82";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff2a82";
    ctx.shadowBlur = 12 * pulse;
    ctx.strokeRect(g.x, g.y, g.w, g.h);
    ctx.restore();
    neonText(ctx, "STAGE", g.x + g.w / 2, g.y - 14, 10, "#ff2a82", "center", 8);
  }

  private drawHearts(ctx: CanvasRenderingContext2D, t: number, w: World) {
    const spr = sprHeart();
    w.level.hearts.forEach((h, i) => {
      if (w.heartsTaken[i]) return;
      if (h.x < this.camX - 30 || h.x > this.camX + W + 30) return;
      const bob = Math.sin(t / 420 + i * 1.7) * 3;
      ctx.save();
      ctx.shadowColor = "#ff3d6e"; ctx.shadowBlur = 8;
      ctx.drawImage(spr, h.x - 6, h.y - 5 + bob, 12, 10);
      ctx.restore();
    });
  }

  private drawVents(ctx: CanvasRenderingContext2D, w: World) {
    const spr = sprVent();
    for (const v of w.level.vents) {
      if (v.x < this.camX - 40 || v.x > this.camX + W + 40) continue;
      const active = (w.tick + v.offset) % v.period < v.onTicks;
      const warn = !active && (w.tick + v.offset) % v.period > v.period - 40;
      ctx.drawImage(spr, v.x, v.y - 9, 16, 9);
      if (active) {
        ctx.save();
        ctx.shadowColor = "#cfe8ff"; ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(207,232,255,0.35)";
        ctx.fillRect(v.x + 2, v.y - 34, 12, 26);
        ctx.restore();
      } else if (warn) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(w.tick / 4);
        ctx.fillStyle = "#cfe8ff";
        ctx.fillRect(v.x + 6, v.y - 16, 4, 8);
        ctx.restore();
      }
    }
  }

  private drawBouncers(ctx: CanvasRenderingContext2D, t: number, w: World) {
    w.level.bouncers.forEach((b, i) => {
      const x = w.bouncerX[i];
      if (x < this.camX - 40 || x > this.camX + W + 40) return;
      const spr = Math.floor(t / 300 + i) % 2 === 0 ? sprBouncerA() : sprBouncerB();
      const dir = w.bouncerDir[i];
      ctx.save();
      if (dir < 0) {
        ctx.translate(Math.round(x) + 10, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, -10, b.y - 28, 20, 28);
      } else {
        ctx.drawImage(spr, Math.round(x) - 10, b.y - 28, 20, 28);
      }
      ctx.restore();
      // aggro blink when player near
      const bdx = Math.abs(w.body.x - x);
      if (bdx < 90) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 90);
        ctx.fillStyle = "#ff2a82";
        ctx.fillRect(Math.round(x) - 1, b.y - 34, 2, 2);
        ctx.restore();
      }
    });
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, t: number, w: World) {
    const b = w.body;
    let spr: HTMLCanvasElement;
    if (!b.onGround) spr = sprPlayerJump();
    else if (Math.abs(b.vx) > 0.3) spr = Math.floor(t / 130) % 2 === 0 ? sprPlayerRunA() : sprPlayerRunB();
    else spr = sprPlayerIdle();
    const blink = b.invuln > 0 && Math.floor(t / 80) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    const dx = Math.round(b.x) - 4; // hitbox 16x30 inside 24x32 sprite
    const dy = Math.round(b.y) - 2;
    if (b.facing < 0) {
      ctx.translate(dx + 12, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, -12, dy, 24, 32);
    } else {
      ctx.drawImage(spr, dx, dy, 24, 32);
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawHUD(ctx: CanvasRenderingContext2D, w: World) {
    const spr = sprHeart();
    ctx.save();
    ctx.shadowColor = "#ff3d6e"; ctx.shadowBlur = 6;
    ctx.drawImage(spr, 10, 8, 12, 10);
    ctx.restore();
    neonText(ctx, `${w.hearts}`, 34, 14, 12, "#ff8fab", "left", 4);
    neonText(ctx, w.level.name, W / 2, 14, 12, "#00e5ff", "center", 6);
    dimText(ctx, `${this.stageIdx + 1}/4`, W - 14, 14, 10, "#8f86b8", "right");
    if (this.save.mute) dimText(ctx, "MUTED (M)", W - 14, 30, 8, "#5a5478", "right");
  }

  private drawPauseMenu(ctx: CanvasRenderingContext2D, t: number) {
    ctx.save();
    ctx.fillStyle = "rgba(5,2,14,0.72)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    panel(ctx, W / 2 - 110, 60, 220, 190);
    neonText(ctx, "PAUSED", W / 2, 80, 18, "#00e5ff", "center", 10);
    for (const b of this.pauseButtons) drawButton(ctx, b, t);
  }
}
