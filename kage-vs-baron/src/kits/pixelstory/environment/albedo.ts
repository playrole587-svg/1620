// Albedo buffers: a set is painted once as material + value (+ facing, + emission),
// then relit every frame. This separates "what the thing is" from "how it is lit",
// so a light that moves through the room really changes the room.

import { RAMPS, type RampName } from "../core/palette.ts";
import { hash2 } from "../core/noise.ts";

export const MATERIALS = Object.keys(RAMPS) as RampName[];
const MAT_INDEX = Object.fromEntries(MATERIALS.map((m, i) => [m, i + 1])) as Record<RampName, number>;

export type Albedo = {
  w: number;
  h: number;
  /** Offset of the buffer's (0,0) in set coordinates (lets layers extend off-screen). */
  ox: number;
  oy: number;
  mat: Uint8Array;
  val: Float32Array;
  emit: Float32Array;
  /** Surface facing: -1..1 per axis. (0,0) faces the camera and takes light from any side. */
  nx: Int8Array;
  ny: Int8Array;
};

export const createAlbedo = (w: number, h: number, ox = 0, oy = 0): Albedo => ({
  w,
  h,
  ox,
  oy,
  mat: new Uint8Array(w * h),
  val: new Float32Array(w * h),
  emit: new Float32Array(w * h),
  nx: new Int8Array(w * h),
  ny: new Int8Array(w * h),
});

export type PaintOpts = { val?: number; emit?: number; nx?: number; ny?: number; jitter?: number; seed?: number };

/** Painter in set coordinates. All shapes clip to the buffer. */
export const painter = (a: Albedo) => {
  const put = (sx: number, sy: number, m: RampName, o: PaintOpts = {}) => {
    const x = Math.round(sx) - a.ox;
    const y = Math.round(sy) - a.oy;
    if (x < 0 || y < 0 || x >= a.w || y >= a.h) return;
    const i = y * a.w + x;
    const j = o.jitter ? (hash2(x * 7 + (o.seed ?? 0), y * 13) - 0.5) * o.jitter : 0;
    a.mat[i] = MAT_INDEX[m];
    a.val[i] = Math.max(0, Math.min(1.2, (o.val ?? 0.6) + j));
    a.emit[i] = o.emit ?? 0;
    a.nx[i] = o.nx ?? 0;
    a.ny[i] = o.ny ?? 0;
  };
  const rect = (x: number, y: number, w: number, h: number, m: RampName, o: PaintOpts = {}) => {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) put(x + xx, y + yy, m, o);
  };
  const hline = (x: number, y: number, w: number, m: RampName, o: PaintOpts = {}) => rect(x, y, w, 1, m, o);
  const vline = (x: number, y: number, h: number, m: RampName, o: PaintOpts = {}) => rect(x, y, 1, h, m, o);
  const disc = (cx: number, cy: number, r: number, m: RampName, o: PaintOpts = {}) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, m, o);
  };
  const ring = (cx: number, cy: number, r: number, m: RampName, o: PaintOpts = {}) => {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (Math.abs(d - r) < 0.55) put(x, y, m, o);
      }
  };
  /** Bresenham line. */
  const line = (x0: number, y0: number, x1: number, y1: number, m: RampName, o: PaintOpts = {}) => {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const X = Math.round(x1);
    const Y = Math.round(y1);
    const dx = Math.abs(X - x);
    const dy = -Math.abs(Y - y);
    const sx = x < X ? 1 : -1;
    const sy = y < Y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      put(x, y, m, o);
      if (x === X && y === Y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };
  /** Polygon fill (even-odd scanline), points in set coordinates. */
  const poly = (pts: [number, number][], m: RampName, o: PaintOpts = {}) => {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5))
          xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(x, y, m, o);
    }
  };
  /** Darken (multiply value) — for painted contact shadows and ambient occlusion. */
  const shade = (x: number, y: number, w: number, h: number, k: number) => {
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const px = Math.round(x + xx) - a.ox;
        const py = Math.round(y + yy) - a.oy;
        if (px < 0 || py < 0 || px >= a.w || py >= a.h) continue;
        a.val[py * a.w + px] *= k;
      }
  };
  return { put, rect, hline, vline, disc, ring, line, poly, shade };
};
