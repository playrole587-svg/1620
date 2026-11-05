// "Template" versions of painted layers: the same world as an unfinished placeholder —
// flat neutral greys, dashed outlines on silhouettes and material edges, a layout grid,
// an X-box where an image should be. The only neutral greys in a film should mean
// "not alive yet". Composite with the living layer through a per-pixel mask.

import { bayer } from "../core/noise";
import { hexToRgb, type RGB } from "../core/palette";
import type { Albedo } from "./albedo";

export type TemplateStyle = {
  fill: string;
  line: string;
  /** Layout grid every `step` art px (set coordinates). */
  grid?: { step: number; color: string };
  /** An image placeholder (box with an X), set coordinates. */
  xbox?: { x0: number; y0: number; x1: number; y1: number };
  /** Material indices treated as another for outlines (texture shouldn't become line work). */
  alias?: Record<number, number>;
};

const cache = new WeakMap<Albedo, Map<string, Uint8ClampedArray>>();

export const templateOf = (a: Albedo, style: TemplateStyle): Uint8ClampedArray => {
  const key = JSON.stringify(style);
  let m = cache.get(a);
  if (!m) cache.set(a, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit;
  const out = new Uint8ClampedArray(a.w * a.h * 4);
  const fill = hexToRgb(style.fill);
  const line = hexToRgb(style.line);
  const grid = style.grid ? hexToRgb(style.grid.color) : null;
  const alias = style.alias ?? {};
  const matAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= a.w || y >= a.h) return 0;
    const m = a.mat[y * a.w + x];
    return alias[m] ?? m;
  };
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x;
      if (!a.mat[i]) continue;
      const m0 = matAt(x, y);
      const sx = x + a.ox;
      const sy = y + a.oy;
      const edge = matAt(x - 1, y) !== m0 || matAt(x + 1, y) !== m0 || matAt(x, y - 1) !== m0 || matAt(x, y + 1) !== m0;
      let c: RGB = fill;
      if (grid && style.grid && (((sx % style.grid.step) + style.grid.step) % style.grid.step === 0 || ((sy % style.grid.step) + style.grid.step) % style.grid.step === 0)) c = grid;
      if (edge && ((sx + sy) >> 1) % 2 === 0) c = line;
      if (style.xbox) {
        const { x0, y0, x1, y1 } = style.xbox;
        if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) {
          const onBox = sx === x0 || sx === x1 || sy === y0 || sy === y1;
          const fx = (sx - x0) / (x1 - x0);
          const fy = (sy - y0) / (y1 - y0);
          const onX = Math.abs(fx - fy) * (x1 - x0) < 0.7 || Math.abs(fx - (1 - fy)) * (x1 - x0) < 0.7;
          c = onBox ? ((sx + sy) % 3 === 0 ? fill : line) : onX ? line : fill;
        }
      }
      out[i * 4] = c[0];
      out[i * 4 + 1] = c[1];
      out[i * 4 + 2] = c[2];
      out[i * 4 + 3] = 255;
    }
  m.set(key, out);
  return out;
};

export type Seam = { width: number; color: string; dither?: boolean };

/**
 * Per-pixel choice between the living and the template layer.
 * `mask(sx, sy)` returns a signed distance in art px: > 0 alive, < 0 template.
 * Pixels within `seam.width` of the boundary become the seam colour (Bayer-dithered),
 * so the change reads as a front of light moving through the world.
 */
export const compositeTemplate = (
  a: Albedo,
  alive: Uint8ClampedArray,
  tpl: Uint8ClampedArray,
  mask: (sx: number, sy: number) => number,
  seams: Seam[],
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(alive.length);
  const seamRgb = seams.map((s) => ({ ...s, rgb: hexToRgb(s.color) }));
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * 4;
      if (!alive[i + 3] && !tpl[i + 3]) continue;
      const sx = x + a.ox;
      const sy = y + a.oy;
      const d = mask(sx, sy);
      let src = d >= 0 ? alive : tpl;
      let rgb: RGB | null = null;
      for (const s of seamRgb) {
        if (Math.abs(d) <= s.width && (!s.dither || (s.width - Math.abs(d)) / s.width > bayer(sx, sy) * 0.8)) {
          rgb = s.rgb;
          break;
        }
      }
      if (!src[i + 3]) src = src === alive ? tpl : alive;
      if (rgb && src[i + 3]) {
        out[i] = rgb[0];
        out[i + 1] = rgb[1];
        out[i + 2] = rgb[2];
        out[i + 3] = 255;
      } else {
        out[i] = src[i];
        out[i + 1] = src[i + 1];
        out[i + 2] = src[i + 2];
        out[i + 3] = src[i + 3];
      }
    }
  return out;
};
