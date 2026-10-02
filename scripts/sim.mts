// Headless verification for NEON VELVET. Run: npm test
// 1. Sprite-map validation (row widths, palette chars).
// 2. Dancer PNG frame-layout check (dimensions + frames actually differ).
// 3. Scripted autopilot playthrough of all 4 stages (move/jump/collect/goal).
// 4. Gallery unlock + save persistence (mock localStorage).
// No DOM, no browser — pure node.

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { validateAllMaps } from "../src/sprites.ts";
import { LEVELS } from "../src/level.ts";
import { createWorld, simulate, solidAt, stepWorld, type World } from "../src/physics.ts";
import { DANCERS } from "../src/types.ts";
import type { InputState } from "../src/types.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS ${name}`);
  else { console.log(`  FAIL ${name} ${detail}`); failures++; }
}

// ------------------------------------------------- mock localStorage ---
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};
const { loadSave, storeSave } = await import("../src/save.ts");

// ------------------------------------------------------- 1. sprite maps ---
console.log("[1] hand-authored sprite maps");
const problems = validateAllMaps();
check("all pixel maps valid", problems.length === 0, problems.slice(0, 5).join("; "));

// --------------------------------------------------- 2. dancer frames ---
console.log("[2] dancer PNG frame layouts");
for (const d of DANCERS) {
  const png = PNG.sync.read(readFileSync(`public/${d.file}`));
  const okDims = png.width === d.frameW * d.frames && png.height === d.frameH;
  check(`${d.name} dims ${png.width}x${png.height}`, okDims,
    `expected ${d.frameW * d.frames}x${d.frameH}`);
  if (!okDims) continue;
  // mean abs diff between frame 0 and frame 1 (must differ = real animation)
  const diffFrame = (fa: number, fb: number) => {
    let sum = 0; let n = 0;
    for (let y = 0; y < d.frameH; y++) {
      for (let x = 0; x < d.frameW; x++) {
        const ia = (y * png.width + fa * d.frameW + x) * 4;
        const ib = (y * png.width + fb * d.frameW + x) * 4;
        sum += Math.abs(png.data[ia] - png.data[ib])
          + Math.abs(png.data[ia + 1] - png.data[ib + 1])
          + Math.abs(png.data[ia + 2] - png.data[ib + 2]);
        n += 3;
      }
    }
    return sum / n;
  };
  const diff = diffFrame(0, 1);
  check(`${d.name} frames differ (anim check)`, diff > 1.0, `meanDiff=${diff.toFixed(2)}`);
  // spot check: last frame differs from first too (not a static strip)
  const diffLast = diffFrame(0, d.frames - 1);
  check(`${d.name} last frame differs`, diffLast > 0.5, `meanDiff=${diffLast.toFixed(2)}`);
}
{
  const bg = PNG.sync.read(readFileSync("public/assets/dancers/Sprite.png"));
  check(`street bg dims ${bg.width}x${bg.height}`, bg.width === 3000 && bg.height === 628);
}

// ------------------------------------------------------- 3. playthrough ---
console.log("[3] autopilot playthrough per stage");

function makeDriver() {
  let lastX = -1;
  let stuck = 0;
  let jumping = false;
  return (w: World): InputState => {
    const b = w.body;
    const input: InputState = { left: false, right: true, jumpHeld: false, jumpPressed: false };
    if (Math.abs(b.x - lastX) < 0.5 && b.onGround) stuck++;
    else { stuck = 0; lastX = b.x; }

    const footY = b.y + b.h;
    const noseX = b.x + b.w + 10;
    const wallAhead = solidAt(w, noseX, b.y + 8) || solidAt(w, noseX, b.y + b.h - 8);
    let groundAhead = false;
    for (let dy = 4; dy <= 48; dy += 8) {
      if (solidAt(w, noseX, footY + dy)) { groundAhead = true; break; }
    }
    let hazardNear = false;
    w.level.bouncers.forEach((bn, i) => {
      const bx = w.bouncerX[i];
      if (bx > b.x - 10 && bx - b.x < 78 && Math.abs(bn.y - footY) < 44) hazardNear = true;
    });
    for (const v of w.level.vents) {
      const active = (w.tick + v.offset) % v.period < v.onTicks;
      if (v.x > b.x - 10 && v.x - b.x < 62 && Math.abs(v.y - footY) < 44) {
        // jump over vents regardless of phase; invuln covers mistiming
        if (active) hazardNear = true;
      }
    }

    const wantJump = (b.onGround || b.coyote > 0) && (!groundAhead || wallAhead || hazardNear || stuck > 40);
    if (wantJump && !jumping) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      jumping = true;
    } else if (jumping) {
      input.jumpHeld = !b.onGround; // full jump while airborne, release on land
      if (b.onGround) jumping = false;
    }
    return input;
  };
}

const stageResults: { hearts: number }[] = [];
LEVELS.forEach((level, i) => {
  let res;
  try {
    res = simulate(level, makeDriver());
  } catch (err) {
    check(`stage ${i + 1} ${level.name}: no exceptions`, false, String(err));
    return;
  }
  check(`stage ${i + 1} ${level.name}: reaches goal`, res.reachedGoal,
    `x=${res.x.toFixed(0)} ticks=${res.ticks} log=${res.log.slice(-4).join(" ")}`);
  check(`stage ${i + 1} ${level.name}: collects hearts`, res.heartsCollected >= 1,
    `collected=${res.heartsCollected}`);
  check(`stage ${i + 1} ${level.name}: finite coords`, Number.isFinite(res.x) && Number.isFinite(res.y), "");
  check(`stage ${i + 1} ${level.name}: no STUCK`, !res.log.some((l) => l.includes("STUCK")),
    res.log.filter((l) => l.includes("STUCK")).join(" "));
  stageResults.push({ hearts: res.heartsCollected });
  console.log(`      deaths=${res.deaths} heartsLost=${res.heartsLost} ticks=${res.ticks}`);
});

// ------------------------------------------------- 4. unlock + save ---
console.log("[4] gallery unlock + save persistence");
{
  const save = loadSave();
  check("fresh save: stage 1 unlocked", save.unlocked === 1, "");
  check("fresh save: gallery empty", save.gallery.every((g) => !g), "");
  // simulate completing each stage (mirrors main.ts onGoal)
  let hearts = 0;
  for (let i = 0; i < 4; i++) {
    save.gallery[i] = true;
    save.unlocked = Math.min(4, Math.max(save.unlocked, i + 2));
    hearts += stageResults[i]?.hearts ?? 0;
  }
  save.hearts += hearts;
  storeSave(save);
  const re = loadSave();
  check("gallery persists", re.gallery.every((g) => g), JSON.stringify(re.gallery));
  check("all stages unlock", re.unlocked === 4, `unlocked=${re.unlocked}`);
  check("hearts persist", re.hearts === hearts, `hearts=${re.hearts}`);
}

// ------------------------------------------------- 5. console-error scan ---
console.log("[5] static console-error scan");
// The game must not call console.error anywhere in shipped code.
import { readFileSync as rfs } from "node:fs";
import { readdirSync } from "node:fs";
const srcFiles = readdirSync("src").filter((f) => f.endsWith(".ts"));
const hits = srcFiles.filter((f) => /console\.(error|warn)/.test(rfs(`src/${f}`, "utf8")));
check("no console.error/warn in src", hits.length === 0, hits.join(","));

// single-tick smoke: stepWorld never throws on empty input across all stages
console.log("[6] stepWorld smoke (idle input, 600 ticks each)");
for (let i = 0; i < LEVELS.length; i++) {
  try {
    const w = createWorld(LEVELS[i]);
    const idle: InputState = { left: false, right: false, jumpHeld: false, jumpPressed: false };
    for (let t = 0; t < 600; t++) stepWorld(w, idle);
    check(`stage ${i + 1} idle sim stable`, Number.isFinite(w.body.x) && Number.isFinite(w.body.y), "");
  } catch (err) {
    check(`stage ${i + 1} idle sim stable`, false, String(err));
  }
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
