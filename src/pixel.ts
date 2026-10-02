// Hand-authored pixel art helpers. Every sprite in this game is a typed pixel
// map below (sprites.ts) rasterized here. No AI-generated art anywhere.

export type PixMap = string[];

// Palette shared by all hand-authored art (night-neon).
export const PAL: Record<string, string> = {
  ".": "rgba(0,0,0,0)",
  k: "#0b0912", // outline black
  h: "#191225", // hair
  s: "#e8b48a", // skin
  d: "#b57e52", // skin shade
  e: "#0b0912", // eyes
  w: "#f4f0ff", // white
  j: "#3a2358", // leather jacket
  J: "#291843", // jacket dark
  m: "#ff2a82", // neon magenta
  M: "#ff7ab3", // neon magenta light
  n: "#00e5ff", // neon cyan
  N: "#0e7f96", // neon cyan dim
  p: "#263056", // pants
  P: "#1a2140", // pants dark
  b: "#100d18", // boots
  c: "#1c1633", // concrete
  C: "#2a2148", // concrete light
  D: "#100c1e", // concrete dark
  r: "#ff3d6e", // heart red
  R: "#ff8fab", // heart light
  u: "#7a4dff", // neon purple
  U: "#4a2a9e", // neon purple dim
  g: "#3a3f4d", // bouncer suit grey
  G: "#23262f", // suit dark
  t: "#d8b25a", // gold (door trim)
  v: "#5a6672", // vent metal
  V: "#39404c", // vent dark
};

const cache = new Map<string, HTMLCanvasElement>();

/** Rasterize a pixel map to an offscreen canvas. Rows are normalized to the
 *  widest row ('.' padded). Throws on unknown palette chars in dev. */
export function px(map: PixMap, key?: string): HTMLCanvasElement {
  const cacheKey = key ?? map.join("\n");
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const w = Math.max(...map.map((r) => r.length));
  const h = map.length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ".";
      if (ch === ".") continue;
      const col = PAL[ch];
      if (!col) throw new Error(`px(): unknown palette char '${ch}'`);
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  cache.set(cacheKey, cv);
  return cv;
}

/** Validate maps in node (no DOM): returns list of problems. */
export function validateMaps(named: Record<string, PixMap>): string[] {
  const problems: string[] = [];
  for (const [name, map] of Object.entries(named)) {
    if (map.length === 0) problems.push(`${name}: empty map`);
    const widths = new Set(map.map((r) => r.length));
    if (widths.size > 1) {
      problems.push(`${name}: ragged rows (widths ${[...widths].join(",")})`);
    }
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const ch = map[y][x];
        if (!(ch in PAL)) problems.push(`${name}: unknown char '${ch}' at ${x},${y}`);
      }
    }
  }
  return problems;
}

/** Horizontal flip of a rasterized sprite (for left-facing player). */
export function flipH(src: HTMLCanvasElement): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext("2d")!;
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return cv;
}
