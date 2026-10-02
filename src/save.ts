// localStorage save: 18+ flag, mute, stage unlocks, gallery, lifetime hearts.

import type { SaveData } from "./types.ts";

const KEY = "neon-velvet-save-v1";

export function defaultSave(): SaveData {
  return { adult: false, mute: false, unlocked: 1, gallery: [false, false, false, false], hearts: 0 };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const p = JSON.parse(raw) as Partial<SaveData>;
    const d = defaultSave();
    return {
      adult: p.adult === true,
      mute: p.mute === true,
      unlocked: Math.min(4, Math.max(1, p.unlocked ?? 1)),
      gallery: Array.isArray(p.gallery) && p.gallery.length === 4
        ? p.gallery.map((g) => g === true)
        : d.gallery,
      hearts: Math.max(0, Math.floor(p.hearts ?? 0)),
    };
  } catch {
    return defaultSave();
  }
}

export function storeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — play session-only */
  }
}
