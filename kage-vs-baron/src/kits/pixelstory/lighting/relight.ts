// Per-pixel relighting of albedo buffers into hand-picked colour ramps.
// Light is accumulated as a scalar and quantised to the material's ramp; the
// fractional part is resolved with a 4×4 Bayer matrix, which gives the soft, stepped
// falloff of hand-dithered pixel art instead of a smooth digital gradient.

import { RAMPS, hexToRgb, type RGB } from "../core/palette.ts";
import { bayer } from "../core/noise.ts";
import { MATERIALS, type Albedo } from "../environment/albedo.ts";

export type Light =
  | { kind: "point"; x: number; y: number; r: number; i: number }
  | {
      kind: "cone";
      x: number;
      y: number;
      r: number;
      i: number;
      /** Direction of the cone, radians (0 = +x, π/2 = down). */
      angle: number;
      /** Half-angle of the bright core, radians. */
      spread: number;
    };

export type RelightOpts = {
  ambient: number;
  exposure?: number;
  /**
   * Width of the dithered band around each ramp step, 0..1. Values near the middle
   * of a step stay flat; only transitions are dithered, as a pixel artist would.
   */
  dither?: number;
};

const RAMP_RGB: RGB[][] = [[], ...MATERIALS.map((m) => RAMPS[m].map(hexToRgb))];

export const relight = (a: Albedo, lights: Light[], o: RelightOpts): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(a.w * a.h * 4);
  const exposure = o.exposure ?? 1;
  const band = Math.max(0.0001, (o.dither ?? 0.45) * 0.5);
  for (let y = 0; y < a.h; y++) {
    const sy = y + a.oy + 0.5;
    for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x;
      const m = a.mat[i];
      if (!m) continue;
      const sx = x + a.ox + 0.5;
      let L = o.ambient;
      const nx = a.nx[i];
      const ny = a.ny[i];
      for (const l of lights) {
        const dx = l.x - sx;
        const dy = l.y - sy;
        const d2 = dx * dx + dy * dy;
        let c = l.i / (1 + (d2 / (l.r * l.r)) * 3);
        if (nx || ny) {
          const d = Math.sqrt(d2) || 1;
          const f = (nx * dx + ny * dy) / (d * Math.hypot(nx, ny));
          c *= f > 0 ? 0.25 + 0.95 * f : 0.12;
        }
        if (l.kind === "cone") {
          let diff = Math.atan2(-dy, -dx) - l.angle;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          const t = Math.abs(diff);
          const edge = l.spread * 1.7;
          c *= t <= l.spread ? 1 : t >= edge ? 0.08 : 0.08 + 0.92 * (1 - (t - l.spread) / (edge - l.spread)) ** 2;
        }
        L += c;
      }
      const v = a.val[i] * L * exposure + a.emit[i];
      const ramp = RAMP_RGB[m];
      const top = ramp.length - 1;
      const f = Math.max(0, Math.min(top, v * top));
      let k = Math.floor(f);
      const frac = f - k;
      if (frac >= 0.5 + band) k++;
      else if (frac > 0.5 - band && (frac - (0.5 - band)) / (2 * band) > bayer(x + a.ox, y + a.oy)) k++;
      if (k > top) k = top;
      const rgb = ramp[k];
      const p = i * 4;
      out[p] = rgb[0];
      out[p + 1] = rgb[1];
      out[p + 2] = rgb[2];
      out[p + 3] = 255;
    }
  }
  return out;
};
