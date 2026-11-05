// "Finishing" pass for hand-drawn fill art: selective outlines (sel-out) and form
// shading from a fixed upper-left key, so every sprite in the film shares one light
// logic. The artist draws flat regions; this pass adds the craft that keeps them
// consistent (outline colour is a dark version of the material it wraps, never black).

import type { Sprite } from "./sprite.ts";

export type Material = { base: string; shade: string; light: string; out: string };

/** How a fill character behaves: which material, which region (for seams), or kept as-is. */
export type FillSpec = { mat?: Material; region: string; keep?: string };

export const finish = (fill: Sprite, spec: Record<string, FillSpec>, pad = 1): Sprite => {
  const W = fill.w + pad * 2;
  const H = fill.h + pad * 2;
  const at = (x: number, y: number) => {
    const fx = x - pad;
    const fy = y - pad;
    if (fx < 0 || fy < 0 || fx >= fill.w || fy >= fill.h) return ".";
    return fill.cells[fy * fill.w + fx];
  };
  const region = (c: string) => (c === "." ? "" : spec[c]?.region ?? c);
  const cells: string[] = new Array(W * H).fill(".");

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = at(x, y);
      if (c === ".") {
        // Outline: take the material of the nearest opaque neighbour (below first, so
        // feet and chins pick the right colour).
        for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
          const n = at(x + dx, y + dy);
          if (n === ".") continue;
          const s = spec[n];
          cells[y * W + x] = s?.mat?.out ?? s?.keep ?? n;
          break;
        }
        continue;
      }
      const s = spec[c];
      if (!s) {
        cells[y * W + x] = c;
        continue;
      }
      if (s.keep) {
        cells[y * W + x] = s.keep;
        continue;
      }
      const m = s.mat!;
      const r = s.region;
      const dr = region(at(x + 1, y + 1));
      const ul = at(x - 1, y - 1);
      const u = at(x, y - 1);
      if (dr !== r) cells[y * W + x] = m.shade;
      else if ((ul === "." && u === ".") || (u === "." && at(x - 1, y) === ".")) cells[y * W + x] = m.light;
      else cells[y * W + x] = m.base;
    }
  }
  return { w: W, h: H, cells };
};
