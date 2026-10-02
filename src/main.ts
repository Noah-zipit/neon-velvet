// NEON VELVET — entry point. Screen state machine, fixed-timestep loop,
// tap routing, audio lifecycle, save persistence.

import { GameAudio } from "./audio.ts";
import { Cutscene } from "./cutscene.ts";
import { Gameplay } from "./game.ts";
import { Input } from "./input.ts";
import { loadSave, storeSave } from "./save.ts";
import {
  CreditsScreen, GalleryScreen, GateScreen, StagesScreen, TitleScreen,
} from "./screens.ts";
import { DANCERS, type SaveData, type ScreenName } from "./types.ts";

const W = 480;
const H = 270;
const STEP = 1000 / 60;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
}
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 100));
fitCanvas();
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

const save: SaveData = loadSave();
const audio = new GameAudio();
audio.setMuted(save.mute);
const input = new Input(canvas);
const gameplay = new Gameplay(ctx, input, audio, save);

const gate = new GateScreen();
const title = new TitleScreen();
const stages = new StagesScreen();
const gallery = new GalleryScreen();
const credits = new CreditsScreen();
let cutscene: Cutscene | null = null;
let cutsceneStage = -1;
let cutsceneShownAt = 0;

let screen: ScreenName = save.adult ? "title" : "gate";
let booted = false;

function showTouch(on: boolean) {
  document.getElementById("touch")!.classList.toggle("on", on);
}
showTouch(false);

function setScreen(s: ScreenName) {
  screen = s;
  showTouch(s === "game");
  if (s === "title" || s === "stages" || s === "gallery" || s === "credits") {
    audio.startMusic();
  }
}

function toggleMute() {
  save.mute = !save.mute;
  audio.setMuted(save.mute);
  storeSave(save);
}

async function startStage(i: number) {
  await gameplay.load();
  input.clearEdges();
  gameplay.startStage(i);
  setScreen("game");
}

async function onGoal(stageIdx: number) {
  // unlock + persist
  save.gallery[stageIdx] = true;
  save.unlocked = Math.min(4, Math.max(save.unlocked, stageIdx + 2));
  save.hearts += gameplay.runHearts;
  storeSave(save);
  audio.sfx("unlock");
  cutsceneStage = stageIdx;
  cutscene = new Cutscene(ctx, audio, DANCERS[stageIdx], false);
  await cutscene.load();
  cutscene.start();
  cutsceneShownAt = performance.now();
  setScreen("cutscene");
}

async function onCutsceneTap() {
  if (!cutscene) return;
  if (performance.now() - cutsceneShownAt < 900) return; // ignore accidental taps
  const wasReplay = cutscene.replay;
  cutscene.stop();
  cutscene = null;
  audio.sfx("click");
  if (wasReplay) {
    setScreen("gallery");
    return;
  }
  if (cutsceneStage >= 0 && cutsceneStage < 3) {
    await startStage(cutsceneStage + 1);
  } else {
    setScreen("stages");
  }
}

async function handleAction(a: string) {
  audio.ensure();
  switch (a) {
    case "gate-yes":
      save.adult = true;
      storeSave(save);
      audio.sfx("click");
      setScreen("title");
      break;
    case "gate-no":
      gate.exited = true;
      break;
    case "title-start":
      audio.sfx("click");
      await stages.load();
      setScreen("stages");
      break;
    case "title-gallery":
      audio.sfx("click");
      await gallery.load();
      setScreen("gallery");
      break;
    case "title-credits":
      audio.sfx("click");
      setScreen("credits");
      break;
    case "title-mute":
      toggleMute();
      audio.sfx("click");
      break;
    case "stages-back":
      audio.sfx("click");
      setScreen("title");
      break;
    case "gallery-back":
      audio.sfx("click");
      setScreen("title");
      break;
    case "credits-back":
      audio.sfx("click");
      setScreen("title");
      break;
    default:
      if (a.startsWith("stage-")) {
        const i = Number(a.slice(6));
        if (Number.isInteger(i) && i >= 0 && i < 4 && i < save.unlocked) {
          audio.sfx("click");
          await startStage(i);
        } else {
          audio.sfx("denied");
        }
      } else if (a.startsWith("gallery-replay-")) {
        const i = Number(a.slice(15));
        if (Number.isInteger(i) && i >= 0 && i < 4 && save.gallery[i]) {
          audio.sfx("click");
          cutscene = new Cutscene(ctx, audio, DANCERS[i], true);
          await cutscene.load();
          cutscene.start();
          cutsceneShownAt = performance.now();
          setScreen("galleryReplay");
        }
      } else if (a.startsWith("pause-")) {
        const cmd = a.slice(6);
        if (cmd === "resume") gameplay.setPaused(false);
        else if (cmd === "restart") { await startStage(gameplay.stageIdx); }
        else if (cmd === "quit") {
          gameplay.setPaused(false);
          setScreen("title");
        } else if (cmd === "mute") { toggleMute(); gameplay.setPaused(true); }
        audio.sfx("click");
      }
  }
}

// global tap routing
input.onTap((x, y) => {
  audio.ensure();
  let action: string | null = null;
  switch (screen) {
    case "gate": action = gate.tap(x, y); break;
    case "title": action = title.tap(x, y); break;
    case "stages": action = stages.tap(x, y); break;
    case "gallery": action = gallery.tap(x, y, save); break;
    case "credits": action = credits.tap(x, y); break;
    case "game":
      action = gameplay.tapPause(x, y);
      break;
    case "cutscene":
    case "galleryReplay":
      void onCutsceneTap();
      break;
  }
  if (action) void handleAction(action);
});

// first-gesture audio unlock
const unlock = () => {
  audio.ensure();
  if (!save.mute && (screen === "title" || screen === "stages" || screen === "gallery" || screen === "credits")) {
    audio.startMusic();
  }
};
window.addEventListener("pointerdown", unlock, { passive: true });
window.addEventListener("keydown", unlock);

// auto-pause when tab hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game") gameplay.setPaused(true);
});

// ------------------------------------------------------------- main loop ---
let last = performance.now();
let acc = 0;

function tick(now: number) {
  requestAnimationFrame(tick);
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250;
  acc += dt;

  while (acc >= STEP) {
    acc -= STEP;
    step();
  }
  render(now);
  if (!booted) {
    booted = true;
    if (screen === "title") audio.startMusic(); // attempt; needs gesture, unlock() covers it
  }
}

function step() {
  if (input.consumeMuteToggle()) toggleMute();
  if (screen === "game") {
    if (input.consumeAny()) {
      // Enter/Space on pause menu = resume handled via buttons; ignore
    }
    const res = gameplay.update();
    if (res === "goal") {
      const idx = gameplay.stageIdx;
      void onGoal(idx);
    }
  } else if (screen === "cutscene" || screen === "galleryReplay") {
    cutscene?.update(STEP);
  } else {
    input.poll();
  }
  // keyboard shortcuts on menus
  if (input.consumeAny()) {
    if (screen === "gate") void handleAction("gate-yes");
    else if (screen === "title") void handleAction("title-start");
  }
}

function render(now: number) {
  ctx.imageSmoothingEnabled = false;
  switch (screen) {
    case "gate": gate.render(ctx, now); break;
    case "title": title.render(ctx, now, save); break;
    case "stages": stages.render(ctx, now, save); break;
    case "gallery": gallery.render(ctx, now, save); break;
    case "credits": credits.render(ctx, now); break;
    case "game": gameplay.render(now); break;
    case "cutscene":
    case "galleryReplay": cutscene?.render(); break;
  }
}

// boot
setScreen(save.adult ? "title" : "gate");
requestAnimationFrame(tick);
