// Palette-indexed sprites. Pure data + pure functions so the same art is used by the
// film, the character sheet and the PNG exporter (scripts/export-sprites.mjs).

import { hexToRgb, type RGB } from "../core/palette.ts";

export type Sprite = { w: number; h: number; cells: string[] };
export type Palette = Record<string, string>;

/** Build a sprite from ASCII rows. '.' and ' ' are transparent. */
export const sprite = (rows: string[]): Sprite => {
  const w = Math.max(...rows.map((r) => r.length));
  const cells: string[] = [];
  for (const r of rows) for (let x = 0; x < w; x++) cells.push(r[x] && r[x] !== " " ? r[x] : ".");
  return { w, h: rows.length, cells };
};

export const blank = (w: number, h: number): Sprite => ({ w, h, cells: new Array(w * h).fill(".") });

export const flipX = (s: Sprite): Sprite => {
  const cells: string[] = new Array(s.w * s.h);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) cells[y * s.w + x] = s.cells[y * s.w + (s.w - 1 - x)];
  return { w: s.w, h: s.h, cells };
};

/** Copy every opaque pixel of `src` into `dst` at (ox, oy). Later layers win. */
export const stamp = (dst: Sprite, src: Sprite, ox: number, oy: number, flip = false) => {
  const ix = Math.round(ox);
  const iy = Math.round(oy);
  for (let y = 0; y < src.h; y++) {
    const dy = iy + y;
    if (dy < 0 || dy >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const c = src.cells[y * src.w + (flip ? src.w - 1 - x : x)];
      if (c === ".") continue;
      const dx = ix + x;
      if (dx < 0 || dx >= dst.w) continue;
      dst.cells[dy * dst.w + dx] = c;
    }
  }
  return dst;
};

/** Replace characters (palette swaps for blinks, flashes, states). */
export const recolor = (s: Sprite, map: Record<string, string>): Sprite => ({
  ...s,
  cells: s.cells.map((c) => map[c] ?? c),
});

export type SpriteLight = {
  /** Direction the light comes FROM, in sprite space (e.g. [-1,-1] = upper left). */
  dir: [number, number];
  color: string;
  /** 0..1 strength of the rim on edges facing the light. */
  rim: number;
  /** 0..1 darkening of edges facing away from the light. */
  core?: number;
  /** 0..1 overall tint toward the light colour (bounce/fill). */
  fill?: number;
  /** Width of the rim in pixels (1 or 2). */
  width?: number;
};

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgbCache = new Map<string, RGB>();
const toRgb = (hex: string) => {
  let v = rgbCache.get(hex);
  if (!v) {
    v = hexToRgb(hex);
    rgbCache.set(hex, v);
  }
  return v;
};

/**
 * Rasterise to RGBA with directional pixel lighting: pixels whose neighbour toward the
 * light is empty get a rim, pixels whose neighbour away from the light is empty fall
 * into core shadow. This is how a sprite "receives" a moving light source.
 */
export const rasterize = (s: Sprite, pal: Palette, lights: SpriteLight[] = [], alpha = 1, gain = 1) => {
  const out = new Uint8ClampedArray(s.w * s.h * 4);
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < s.w && y < s.h && s.cells[y * s.w + x] !== ".";
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const c = s.cells[y * s.w + x];
      if (c === ".") continue;
      const hex = pal[c];
      if (!hex) continue;
      let rgb = toRgb(hex);
      if (gain !== 1) rgb = [rgb[0] * gain, rgb[1] * gain, rgb[2] * gain];
      for (const L of lights) {
        const lc = toRgb(L.color);
        const n = Math.hypot(L.dir[0], L.dir[1]) || 1;
        const dx = Math.round(L.dir[0] / n);
        const dy = Math.round(L.dir[1] / n);
        if (L.fill) rgb = mix(rgb, lc, L.fill * 0.5);
        const w = L.width ?? 1;
        let rimHit = 0;
        for (let k = 1; k <= w; k++) if (!opaque(x + dx * k, y + dy * k)) rimHit = Math.max(rimHit, 1 - (k - 1) * 0.55);
        if (rimHit) rgb = mix(rgb, lc, L.rim * rimHit);
        if (L.core && !opaque(x - dx, y - dy)) rgb = mix(rgb, [12, 6, 8], L.core);
      }
      const i = (y * s.w + x) * 4;
      out[i] = rgb[0];
      out[i + 1] = rgb[1];
      out[i + 2] = rgb[2];
      out[i + 3] = 255 * alpha;
    }
  }
  return out;
};
