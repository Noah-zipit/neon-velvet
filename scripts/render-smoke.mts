// Render smoke test: executes the real canvas code paths (gameplay, cutscene,
// all screens) headlessly with node-canvas, catching runtime errors and
// producing PNGs for visual inspection. Run from repo root:
//   cd public && node --experimental-strip-types --no-warnings ../scripts/render-smoke.mts

import { writeFileSync } from "node:fs";
import { createCanvas, Image as CanvasImage } from "canvas";
import { Gameplay } from "../src/game.ts";
import { Cutscene } from "../src/cutscene.ts";
import { solidAt, stepWorld } from "../src/physics.ts";
import { LEVELS } from "../src/level.ts";
import { DANCERS } from "../src/types.ts";
import {
  CreditsScreen, GalleryScreen, GateScreen, StagesScreen, TitleScreen,
} from "../src/screens.ts";
import type { InputState } from "../src/types.ts";

// ---- DOM stubs ----
const stubEl = () => ({
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
});
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag === "canvas") return createCanvas(8, 8);
    throw new Error(`unexpected element ${tag}`);
  },
  getElementById: () => stubEl(),
};
(globalThis as unknown as { Image: unknown }).Image = CanvasImage;
(globalThis as unknown as { window: unknown }).window = {};

const errors: string[] = [];
function shot(name: string, cv: { toBuffer: () => Buffer }) {
  writeFileSync(`/tmp/smoke_${name}.png`, cv.toBuffer("image/png"));
  console.log(`  wrote /tmp/smoke_${name}.png`);
}

const audioStub = {
  startMusic() {}, stopMusic() {}, startCrowd() {}, stopCrowd() {},
  sfx(_n: string) {}, setMuted(_m: boolean) {},
};
const mkInput = () => ({
  state: { left: false, right: false, jumpHeld: false, jumpPressed: false } as InputState,
  poll() {}, consumePause: () => false, consumeMuteToggle: () => false,
});

try {
  console.log("[smoke] gameplay render across stage 1");
  const cv = createCanvas(480, 270);
  const ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  const input = mkInput();
  const save = { adult: true, mute: true, unlocked: 4, gallery: [true, true, true, true], hearts: 42 };
  const game = new Gameplay(ctx, input as never, audioStub as never, save);
  await game.load();
  game.startStage(0);
  const w = game.world!;
  let frames = 0;
  for (let t = 0; t < 400 && !w.reachedGoal; t++) {
    // simple driver: run right, jump at gaps
    const b = w.body;
    const noseX = b.x + b.w + 10;
    let groundAhead = false;
    for (let dy = 4; dy <= 48; dy += 8) {
      if (solidAt(w, noseX, b.y + b.h + dy)) { groundAhead = true; break; }
    }
    input.state.right = true;
    input.state.jumpPressed = (b.onGround || b.coyote > 0) && !groundAhead;
    input.state.jumpHeld = input.state.jumpPressed || !b.onGround;
    const res = game.update();
    if (t % 10 === 0) { game.render(t * 16.7); frames++; }
    if (t === 200) shot("gameplay_mid", cv);
    if (res === "goal") break;
  }
  game.render(400 * 16.7);
  shot("gameplay_end", cv);
  console.log(`  hearts=${w.hearts} renderFrames=${frames} (goal-reaching verified separately in sim.mts)`);

  console.log("[smoke] pause menu");
  game.setPaused(true);
  game.render(9999);
  shot("pause", cv);
  const pa = game.tapPause(240, 107); // RESUME button
  console.log(`  tapPause resume -> ${pa}`);
  if (pa !== "pause-resume") errors.push(`tapPause expected pause-resume, got ${pa}`);
  game.setPaused(false);

  console.log("[smoke] all 4 stages boot + render");
  for (let i = 0; i < 4; i++) {
    game.startStage(i);
    for (let t = 0; t < 120; t++) {
      input.state.right = true;
      input.state.jumpPressed = false;
      input.state.jumpHeld = false;
      game.update();
      if (t % 15 === 0) game.render(t * 16.7);
    }
    game.render(120 * 16.7);
    shot(`stage${i + 1}`, cv);
  }
} catch (e) {
  errors.push(`gameplay: ${String(e)}`);
}

try {
  console.log("[smoke] cutscene (ONYX, 126 frames)");
  const cv = createCanvas(480, 270);
  const ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  const cs = new Cutscene(ctx, audioStub as never, DANCERS[3], false);
  await cs.load();
  cs.start();
  for (const t of [0, 1500, 4000, 9000]) {
    cs.update(t === 0 ? 0 : 1500);
    cs.render();
  }
  shot("cutscene", cv);
  cs.stop();
} catch (e) {
  errors.push(`cutscene: ${String(e)}`);
}

try {
  console.log("[smoke] menu screens");
  const cv = createCanvas(480, 270);
  const ctx = cv.getContext("2d") as unknown as CanvasRenderingContext2D;
  const save = { adult: true, mute: false, unlocked: 3, gallery: [true, true, false, false], hearts: 17 };
  new GateScreen().render(ctx, 1000);
  shot("gate", cv);
  new TitleScreen().render(ctx, 1000, save);
  shot("title", cv);
  const stages = new StagesScreen();
  await stages.load();
  stages.render(ctx, 1000, save);
  shot("stages", cv);
  const gal = new GalleryScreen();
  await gal.load();
  gal.render(ctx, 2500, save);
  shot("gallery", cv);
  new CreditsScreen().render(ctx, 1000);
  shot("credits", cv);
  // tap routing sanity
  const a1 = new TitleScreen();
  a1.render(ctx, 0, save);
  console.log(`  title tap START -> ${a1.tap(240, 144)}`);
  const a2 = new GateScreen();
  a2.render(ctx, 0);
  console.log(`  gate tap ENTER -> ${a2.tap(170, 207)}`);
} catch (e) {
  errors.push(`screens: ${String(e)}`);
}

console.log(errors.length === 0 ? "\nSMOKE OK" : `\nSMOKE FAILURES:\n- ${errors.join("\n- ")}`);
process.exit(errors.length === 0 ? 0 : 1);
