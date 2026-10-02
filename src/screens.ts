// Menu screens: 18+ gate, title, stage select, gallery, credits.
// Immediate-mode: render(ctx, t, ...) + tap(x, y) -> action string | null.

import { loadDancer, drawDancerFrame, dancerSilhouette } from "./cutscene.ts";
import type { DancerInfo, SaveData } from "./types.ts";
import { DANCERS, STAGE_NAMES } from "./types.ts";
import {
  dimText, drawButton, hitButton, logo, neonText, type Button,
} from "./ui.ts";

const W = 480;
const H = 270;

// ------------------------------------------------------------ 18+ gate ---
export class GateScreen {
  buttons: Button[] = [];
  exited = false;

  render(ctx: CanvasRenderingContext2D, t: number) {
    ctx.fillStyle = "#0a0618";
    ctx.fillRect(0, 0, W, H);
    logo(ctx, W / 2, 60, 0.8, t);
    neonText(ctx, "ADULTS ONLY — 18+", W / 2, 130, 16, "#ff2a82", "center", 10);
    dimText(ctx, "This game contains explicit pixel-art nudity.", W / 2, 152, 9);
    dimText(ctx, "You must be 18 or older to enter.", W / 2, 166, 9);
    this.buttons = [
      { id: "gate-yes", x: W / 2 - 150, y: 190, w: 140, h: 34, label: "I AM 18+ — ENTER", color: "#00e5ff" },
      { id: "gate-no", x: W / 2 + 10, y: 190, w: 140, h: 34, label: "EXIT", color: "#5a5478" },
    ];
    for (const b of this.buttons) drawButton(ctx, b, t);
    if (this.exited) {
      ctx.fillStyle = "rgba(5,2,14,0.9)";
      ctx.fillRect(0, 0, W, H);
      neonText(ctx, "COME BACK WHEN YOU'RE 18.", W / 2, H / 2, 14, "#8f86b8", "center", 4);
    }
  }

  tap(x: number, y: number): string | null {
    if (this.exited) return null;
    for (const b of this.buttons) if (hitButton(b, x, y)) return b.id;
    return null;
  }
}

// ----------------------------------------------------------------- title ---
export class TitleScreen {
  buttons: Button[] = [];

  render(ctx: CanvasRenderingContext2D, t: number, save: SaveData) {
    ctx.fillStyle = "#0a0618";
    ctx.fillRect(0, 0, W, H);
    // backdrop glow strips
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a0618");
    g.addColorStop(0.7, "#170b30");
    g.addColorStop(1, "#0a0618");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    logo(ctx, W / 2, 52, 1, t);
    this.buttons = [
      { id: "title-start", x: W / 2 - 80, y: 136, w: 160, h: 32, label: "▶ START", color: "#00e5ff" },
      { id: "title-gallery", x: W / 2 - 80, y: 174, w: 160, h: 32, label: "GALLERY", color: "#ff2a82" },
      { id: "title-credits", x: W / 2 - 80, y: 212, w: 160, h: 32, label: "CREDITS", color: "#b44dff" },
      { id: "title-mute", x: W - 92, y: 10, w: 82, h: 24, label: save.mute ? "SOUND OFF" : "SOUND ON", color: "#8f86b8", small: true },
    ];
    for (const b of this.buttons) drawButton(ctx, b, t);
    const n = save.gallery.filter(Boolean).length;
    dimText(ctx, `DANCERS UNLOCKED: ${n}/4   ♥ ${save.hearts}`, W / 2, 256, 9);
  }

  tap(x: number, y: number): string | null {
    for (const b of this.buttons) if (hitButton(b, x, y)) return b.id;
    return null;
  }
}

// ---------------------------------------------------------- stage select ---
export class StagesScreen {
  buttons: Button[] = [];
  private imgs = new Map<string, HTMLImageElement>();
  private loading = false;

  async load() {
    if (this.loading || this.imgs.size === DANCERS.length) return;
    this.loading = true;
    await Promise.all(
      DANCERS.map(async (d) => this.imgs.set(d.name, await loadDancer(d))),
    );
  }

  render(ctx: CanvasRenderingContext2D, t: number, save: SaveData) {
    ctx.fillStyle = "#0a0618";
    ctx.fillRect(0, 0, W, H);
    neonText(ctx, "SELECT STAGE", W / 2, 26, 18, "#00e5ff", "center", 10);
    this.buttons = [];
    const cw = 150, ch = 84;
    const xs = [62, 268];
    const ys = [48, 148];
    DANCERS.forEach((d, i) => {
      const x = xs[i % 2], y = ys[Math.floor(i / 2)];
      const unlockedStage = i < save.unlocked;
      const col = unlockedStage ? (i % 2 === 0 ? "#00e5ff" : "#ff2a82") : "#3a3355";
      ctx.save();
      ctx.fillStyle = "rgba(16,8,34,0.9)";
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = unlockedStage ? 8 : 0;
      ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.fill(); ctx.stroke();
      ctx.restore();
      // dancer preview / silhouette
      const img = this.imgs.get(d.name);
      const px = x + 12, py = y + 10, pw = 34, ph = Math.round((34 / d.frameW) * d.frameH);
      if (img) {
        if (unlockedStage) drawDancerFrame(ctx, img, d, 0, px, py, pw, ph);
        else ctx.drawImage(dancerSilhouette(img, d), px, py, pw, ph);
      }
      neonText(ctx, `${i + 1}. ${STAGE_NAMES[i]}`, x + 56, y + 22, 11, unlockedStage ? "#e8f6ff" : "#5a5478", "left", 4);
      neonText(ctx, d.name, x + 56, y + 42, 13, unlockedStage ? col : "#3a3355", "left", 6);
      dimText(ctx, unlockedStage ? (save.gallery[i] ? "★ CLEARED" : "PLAY") : "🔒 LOCKED", x + 56, y + 62, 9, unlockedStage ? "#8f86b8" : "#3a3355", "left");
      if (unlockedStage) this.buttons.push({ id: `stage-${i}`, x, y, w: cw, h: ch, label: "", color: col });
    });
    this.buttons.push({ id: "stages-back", x: 14, y: H - 36, w: 90, h: 26, label: "← BACK", color: "#8f86b8", small: true });
    drawButton(ctx, this.buttons[this.buttons.length - 1], t);
  }

  tap(x: number, y: number): string | null {
    for (const b of this.buttons) if (hitButton(b, x, y)) return b.id;
    return null;
  }
}

// --------------------------------------------------------------- gallery ---
export class GalleryScreen {
  private imgs = new Map<string, HTMLImageElement>();
  private loading = false;

  async load() {
    if (this.loading || this.imgs.size === DANCERS.length) return;
    this.loading = true;
    await Promise.all(
      DANCERS.map(async (d) => this.imgs.set(d.name, await loadDancer(d))),
    );
  }

  render(ctx: CanvasRenderingContext2D, t: number, save: SaveData) {
    ctx.fillStyle = "#0a0618";
    ctx.fillRect(0, 0, W, H);
    neonText(ctx, "GALLERY", W / 2, 26, 18, "#ff2a82", "center", 10);
    dimText(ctx, "Finish a stage to unlock her dance", W / 2, 46, 9);
    DANCERS.forEach((d: DancerInfo, i: number) => {
      const x = 26 + i * 112, y = 62, cw = 100, ch = 150;
      const unlocked = save.gallery[i];
      ctx.save();
      ctx.fillStyle = "rgba(16,8,34,0.9)";
      ctx.strokeStyle = unlocked ? "#ff2a82" : "#3a3355";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff2a82";
      ctx.shadowBlur = unlocked ? 8 : 0;
      ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.fill(); ctx.stroke();
      ctx.restore();
      const img = this.imgs.get(d.name);
      if (img) {
        const scale = Math.min((cw - 16) / d.frameW, 96 / d.frameH);
        const dw = d.frameW * scale, dh = d.frameH * scale;
        const dx = x + (cw - dw) / 2, dy = y + 12;
        if (unlocked) {
          const frame = Math.floor((t / 1000) * 12 + i * 7);
          drawDancerFrame(ctx, img, d, frame, dx, dy, dw, dh);
        } else {
          ctx.drawImage(dancerSilhouette(img, d), dx, dy, dw, dh);
        }
      }
      neonText(ctx, d.name, x + cw / 2, y + ch - 30, 12, unlocked ? "#ff7ab3" : "#3a3355", "center", 4);
      dimText(ctx, unlocked ? "TAP TO REPLAY" : "🔒 LOCKED", x + cw / 2, y + ch - 14, 8, unlocked ? "#8f86b8" : "#3a3355");
    });
    const back: Button = { id: "gallery-back", x: 14, y: H - 36, w: 90, h: 26, label: "← BACK", color: "#8f86b8", small: true };
    drawButton(ctx, back, t);
    this.backBtn = back;
  }

  private backBtn: Button = { id: "gallery-back", x: 0, y: 0, w: 0, h: 0, label: "" };

  tap(x: number, y: number, save: SaveData): string | null {
    if (hitButton(this.backBtn, x, y)) return "gallery-back";
    for (let i = 0; i < 4; i++) {
      const cx = 26 + i * 112;
      if (x >= cx && x <= cx + 100 && y >= 62 && y <= 212 && save.gallery[i]) {
        return `gallery-replay-${i}`;
      }
    }
    return null;
  }
}

// --------------------------------------------------------------- credits ---
export class CreditsScreen {
  render(ctx: CanvasRenderingContext2D, t: number) {
    ctx.fillStyle = "#0a0618";
    ctx.fillRect(0, 0, W, H);
    neonText(ctx, "CREDITS", W / 2, 40, 20, "#b44dff", "center", 10);
    const lines: [string, string][] = [
      ["DANCERS + STREET ART", "PuraPiedr4 — \"Free Nightclub Girls\" (itch.io, free)"],
      ["PLAYER / TILES / FX", "Hand-authored pixel art, written in code"],
      ["MUSIC + SFX", "Synthesized live with WebAudio"],
      ["BUILT WITH", "TypeScript + Vite + Canvas 2D"],
    ];
    lines.forEach(([a, b], i) => {
      neonText(ctx, a, W / 2, 90 + i * 36, 11, "#00e5ff", "center", 4);
      dimText(ctx, b, W / 2, 106 + i * 36, 9);
    });
    const back: Button = { id: "credits-back", x: W / 2 - 45, y: H - 44, w: 90, h: 26, label: "← BACK", color: "#8f86b8", small: true };
    drawButton(ctx, back, t);
    this.backBtn = back;
  }

  private backBtn: Button = { id: "credits-back", x: 0, y: 0, w: 0, h: 0, label: "" };

  tap(x: number, y: number): string | null {
    return hitButton(this.backBtn, x, y) ? "credits-back" : null;
  }
}
