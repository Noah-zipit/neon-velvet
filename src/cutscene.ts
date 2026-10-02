// Performance cutscene: the dancer's REAL PuraPiedr4 animation strip,
// looped at ~12fps on a club stage. Spotlights, crowd silhouettes, neon frame.
// Never redrawn or altered — frames are sliced straight from the source PNG.

import { GameAudio } from "./audio.ts";
import type { DancerInfo } from "./types.ts";
import { dimText, neonText } from "./ui.ts";

const W = 480;
const H = 270;
const FPS = 12;

const BASE = import.meta.env?.BASE_URL || "./";

export function loadDancer(d: DancerInfo): Promise<HTMLImageElement> {
  const b = BASE.endsWith("/") ? BASE : BASE + "/";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${d.file}`));
    img.src = b + d.file;
  });
}

/** Draw one strip frame; returns nothing. Pure canvas. */
export function drawDancerFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  d: DancerInfo,
  frameIdx: number,
  dx: number, dy: number, dw: number, dh: number,
) {
  const f = ((frameIdx % d.frames) + d.frames) % d.frames;
  ctx.drawImage(img, f * d.frameW, 0, d.frameW, d.frameH, dx, dy, dw, dh);
}

const silCache = new Map<string, HTMLCanvasElement>();
/** Black silhouette of a dancer frame (for locked gallery slots). */
export function dancerSilhouette(img: HTMLImageElement, d: DancerInfo): HTMLCanvasElement {
  const key = d.name;
  const hit = silCache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = d.frameW; cv.height = d.frameH;
  const g = cv.getContext("2d")!;
  g.drawImage(img, 0, 0, d.frameW, d.frameH, 0, 0, d.frameW, d.frameH);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#05030c";
  g.fillRect(0, 0, d.frameW, d.frameH);
  silCache.set(key, cv);
  return cv;
}

export class Cutscene {
  t = 0; // ms
  private ctx: CanvasRenderingContext2D;
  private audio: GameAudio;
  readonly dancer: DancerInfo;
  readonly replay: boolean;
  private img: HTMLImageElement | null = null;
  private crowdSeed: number[] = [];

  constructor(
    ctx: CanvasRenderingContext2D,
    audio: GameAudio,
    dancer: DancerInfo,
    replay = false,
  ) {
    this.ctx = ctx;
    this.audio = audio;
    this.dancer = dancer;
    this.replay = replay;
  }

  async load(): Promise<void> {
    this.img = await loadDancer(this.dancer);
    this.crowdSeed = Array.from({ length: 26 }, (_, i) => (i * 137.5) % 1);
  }

  start() {
    this.t = 0;
    this.audio.stopMusic();
    this.audio.startCrowd();
  }

  stop() {
    this.audio.stopCrowd();
  }

  update(dtMs: number) {
    this.t += dtMs;
  }

  render() {
    const ctx = this.ctx;
    const img = this.img;
    // club backdrop
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b0518");
    g.addColorStop(0.55, "#160a2e");
    g.addColorStop(1, "#08040f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // spotlights sweeping
    for (let i = 0; i < 3; i++) {
      const sx = W / 2 + Math.sin(this.t / 1400 + (i * Math.PI * 2) / 3) * 150;
      const sg = ctx.createLinearGradient(sx, 0, sx, H);
      const col = i === 0 ? "255,42,130" : i === 1 ? "0,229,255" : "180,77,255";
      sg.addColorStop(0, `rgba(${col},0.28)`);
      sg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(sx - 14, 0);
      ctx.lineTo(sx + 14, 0);
      ctx.lineTo(sx + 70, H);
      ctx.lineTo(sx - 70, H);
      ctx.closePath();
      ctx.fill();
    }

    // stage floor
    ctx.fillStyle = "#0a0616";
    ctx.fillRect(0, 196, W, 74);
    ctx.fillStyle = "rgba(255,42,130,0.5)";
    ctx.fillRect(0, 196, W, 2);

    // the dancer, ~12fps, scaled up
    if (img) {
      const scale = this.dancer.frameH >= 144 ? 1.35 : 1.9;
      const dw = this.dancer.frameW * scale;
      const dh = this.dancer.frameH * scale;
      const dx = W / 2 - dw / 2;
      const dy = 196 - dh + 6;
      const frame = Math.floor((this.t / 1000) * FPS);
      ctx.save();
      ctx.shadowColor = "#ff2a82";
      ctx.shadowBlur = 24;
      drawDancerFrame(ctx, img, this.dancer, frame, dx, dy, dw, dh);
      ctx.restore();
    }

    // crowd silhouettes bobbing at the bottom
    ctx.fillStyle = "#040209";
    for (let i = 0; i < this.crowdSeed.length; i++) {
      const cx = (i / this.crowdSeed.length) * W;
      const bob = Math.abs(Math.sin(this.t / 380 + i * 1.3)) * 8;
      const r = 13 + this.crowdSeed[i] * 8;
      ctx.beginPath();
      ctx.arc(cx, H + 6 - bob, r, Math.PI, 0);
      ctx.fill();
      // raised hands here and there
      if (i % 3 === 0) {
        ctx.fillRect(cx - r + 3, H - r * 1.7 - bob, 4, r * 0.9);
      }
    }

    // neon frame
    ctx.save();
    ctx.strokeStyle = "#ff2a82";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff2a82";
    ctx.shadowBlur = 14;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.strokeStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.restore();

    // name card
    panel2(ctx);
    neonText(ctx, this.dancer.name, W / 2, 34, 22, "#ff2a82", "center", 12);
    dimText(ctx, this.dancer.tagline.toUpperCase(), W / 2, 54, 9, "#9fd8ff");

    if (!this.replay) {
      neonText(ctx, "★ UNLOCKED IN GALLERY ★", W / 2, 76, 10, "#ffd75a", "center", 8);
    } else {
      dimText(ctx, "GALLERY REPLAY", W / 2, 76, 10, "#8f86b8");
    }
    if (Math.sin(this.t / 350) > -0.2) {
      neonText(ctx, "TAP TO CONTINUE", W / 2, H - 26, 11, "#00e5ff", "center", 8);
    }
  }
}

function panel2(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(10,4,24,0.72)";
  ctx.fillRect(W / 2 - 130, 16, 260, 66);
  ctx.strokeStyle = "rgba(255,42,130,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - 130, 16, 260, 66);
  ctx.restore();
}
