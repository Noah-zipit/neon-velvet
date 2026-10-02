// Keyboard + touch input. Touch buttons live in index.html (#touch overlay).

import type { InputState } from "./types.ts";

export class Input {
  private canvas: HTMLCanvasElement;
  state: InputState = { left: false, right: false, jumpHeld: false, jumpPressed: false };
  private keys = new Set<string>();
  private touch = { left: false, right: false, jump: false };
  pausePressed = false; // edge, consumed by game
  anyPressed = false; // edge for menus, consumed by screens
  private jumpEdgeLatch = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", (e) => {
      if (e.repeat) { if (this.isJumpKey(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code);
      if (this.isJumpKey(e.code)) {
        this.jumpEdgeLatch = true;
        e.preventDefault();
      }
      if (e.code === "Escape" || e.code === "KeyP") this.pausePressed = true;
      if (e.code === "Enter" || e.code === "Space") this.anyPressed = true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyM") this.toggleMuteReq = true;
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => { this.keys.clear(); this.touch = { left: false, right: false, jump: false }; });

    // Touch buttons
    const bind = (id: string, on: () => void, off: () => void) => {
      const el = document.getElementById(id)!;
      const start = (e: Event) => { e.preventDefault(); on(); };
      const end = (e: Event) => { e.preventDefault(); off(); };
      el.addEventListener("pointerdown", start);
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("pointerleave", end);
    };
    bind("btnL", () => (this.touch.left = true), () => (this.touch.left = false));
    bind("btnR", () => (this.touch.right = true), () => (this.touch.right = false));
    bind("btnJ", () => { this.touch.jump = true; this.jumpEdgeLatch = true; }, () => (this.touch.jump = false));
    bind("btnP", () => (this.pausePressed = true), () => undefined);

    // Show touch controls on touch devices
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      document.getElementById("touch")!.classList.add("on");
    }
  }

  toggleMuteReq = false;

  private isJumpKey(code: string) {
    return code === "Space" || code === "ArrowUp" || code === "KeyW";
  }

  /** Call once per tick; folds keys+touch into state. */
  poll() {
    const k = this.keys;
    this.state.left = k.has("ArrowLeft") || k.has("KeyA") || this.touch.left;
    this.state.right = k.has("ArrowRight") || k.has("KeyD") || this.touch.right;
    this.state.jumpHeld =
      k.has("Space") || k.has("ArrowUp") || k.has("KeyW") || this.touch.jump;
    this.state.jumpPressed = this.jumpEdgeLatch;
    this.jumpEdgeLatch = false;
  }

  consumePause() { const v = this.pausePressed; this.pausePressed = false; return v; }
  consumeAny() { const v = this.anyPressed; this.anyPressed = false; return v; }
  consumeMuteToggle() { const v = this.toggleMuteReq; this.toggleMuteReq = false; return v; }

  /** Clear edge-triggered flags (call on screen transitions). */
  clearEdges() {
    this.jumpEdgeLatch = false;
    this.pausePressed = false;
    this.anyPressed = false;
    this.state.jumpPressed = false;
  }

  /** Canvas pointer in internal 480x270 coords. */
  onTap(cb: (x: number, y: number) => void): () => void {
    const h = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 480;
      const y = ((e.clientY - r.top) / r.height) * 270;
      cb(x, y);
    };
    this.canvas.addEventListener("pointerdown", h);
    return () => this.canvas.removeEventListener("pointerdown", h);
  }
}
