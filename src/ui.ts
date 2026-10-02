// Tiny immediate-mode UI helpers: neon text, panels, buttons.

export interface Button {
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  color?: string;
  small?: boolean;
}

export function neonText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "center",
  glow = 8,
) {
  ctx.save();
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function dimText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  size: number,
  color = "#8f86b8",
  align: CanvasTextAlign = "center",
) {
  ctx.save();
  ctx.font = `${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "rgba(14,8,32,0.92)";
  ctx.strokeStyle = "#ff2a82";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ff2a82";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawButton(ctx: CanvasRenderingContext2D, b: Button, t: number) {
  const pulse = b.color ? 6 + Math.sin(t / 300) * 2 : 0;
  ctx.save();
  ctx.fillStyle = "rgba(20,10,40,0.9)";
  ctx.strokeStyle = b.color ?? "#00e5ff";
  ctx.lineWidth = 2;
  ctx.shadowColor = b.color ?? "#00e5ff";
  ctx.shadowBlur = 6 + pulse;
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  neonText(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, b.small ? 10 : 13, b.color ?? "#c9f6ff", "center", 4);
}

export function hitButton(b: Button, x: number, y: number): boolean {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function logo(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number) {
  const flicker = Math.sin(t / 90) > 0.985 ? 0.4 : 1;
  ctx.save();
  ctx.globalAlpha = flicker;
  neonText(ctx, "NEON", x, y, 44 * scale, "#00e5ff", "center", 18);
  neonText(ctx, "VELVET", x, y + 40 * scale, 44 * scale, "#ff2a82", "center", 18);
  ctx.restore();
  dimText(ctx, "AN 18+ PIXEL CABARET", x, y + 66 * scale, 9 * scale, "#8f86b8");
}
