// Reusable architectural pieces for the voxel kit: brick walls with openings,
// window frames, sills, planters. Authored in a local frame where the wall plane
// is z = 0 and the outside faces +Z; place them with `v.at(...)`.

import { C } from "./palette";
import type { Vox, V3 } from "./voxel";

export type Hole = [number, number, number, number]; // x0, x1, y0, y1

const BRICKS = [C.brick, C.brick, C.brickLight, C.brickDark, C.brick, 0xa65a3f];

/** Running-bond brick skin with mortar backing; openings are cut cleanly. */
export const brickWall = (
  v: Vox,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  holes: Hole[] = [],
  { len = 0.42, h = 0.2, gap = 0.028, depth = 0.1, back = 0.24, palette = BRICKS as number[] } = {},
) => {
  // Mortar backing as solid slabs around the holes.
  slabWithHoles(v, x0, x1, y0, y1, -back, 0, holes, C.mortar);
  const pitch = h + gap;
  let row = 0;
  for (let y = y0 + gap / 2; y + h <= y1 + 1e-6; y += pitch, row++) {
    const yc0 = y, yc1 = y + h;
    const off = row % 2 === 0 ? 0 : len / 2;
    for (let bx = x0 - off; bx < x1; bx += len + gap) {
      let segs: [number, number][] = [[Math.max(x0, bx), Math.min(x1, bx + len)]];
      for (const [hx0, hx1, hy0, hy1] of holes) {
        if (yc1 <= hy0 || yc0 >= hy1) continue;
        segs = segs.flatMap(([a, b]) => {
          const out: [number, number][] = [];
          if (a < hx0) out.push([a, Math.min(b, hx0 - gap / 2)]);
          if (b > hx1) out.push([Math.max(a, hx1 + gap / 2), b]);
          return out;
        });
      }
      for (const [a, b] of segs) {
        if (b - a < 0.06) continue;
        const col = palette[Math.floor(v.rand() * palette.length)];
        // Bricks sit a hair proud or recessed at random: hand-laid, not extruded.
        const proud = depth / 2 + (v.rand() - 0.5) * 0.012;
        v.box([(a + b) / 2, (yc0 + yc1) / 2, proud - depth / 2 + 0.0], [b - a, h, depth], col, {
          jitter: 0.07,
          r: 0.022,
        });
      }
    }
  }
};

/** Solid slab between z0..z1 covering a rectangle minus rectangular holes. */
export const slabWithHoles = (
  v: Vox,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  holes: Hole[],
  color: number,
  mat: "matte" | "satin" = "matte",
) => {
  // Split into horizontal bands at every hole edge, then fill each band between holes.
  const ys = [...new Set([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])])].filter((y) => y >= y0 && y <= y1).sort((a, b) => a - b);
  for (let i = 0; i < ys.length - 1; i++) {
    const ya = ys[i], yb = ys[i + 1];
    const inBand = holes.filter((h) => h[2] < yb - 1e-6 && h[3] > ya + 1e-6).sort((a, b) => a[0] - b[0]);
    let x = x0;
    for (const h of inBand) {
      if (h[0] > x + 1e-6) v.span([x, ya, z0], [h[0], yb, z1], color, { r: 0.01, mat });
      x = Math.max(x, h[1]);
    }
    if (x < x1 - 1e-6) v.span([x, ya, z0], [x1, yb, z1], color, { r: 0.01, mat });
  }
};

/** Window frame with mullions and a transom, set into an opening. */
export const windowFrame = (
  v: Vox,
  [x0, x1, y0, y1]: Hole,
  {
    color = C.tealDeep as number,
    t = 0.08,
    depth = 0.14,
    z = -0.12,
    mullions = [] as readonly number[],
    transom = null as number | null,
  } = {},
) => {
  const o = { mat: "satin" as const, r: 0.015 };
  v.span([x0, y0, z - depth / 2], [x1, y0 + t, z + depth / 2], color, o);
  v.span([x0, y1 - t, z - depth / 2], [x1, y1, z + depth / 2], color, o);
  v.span([x0, y0, z - depth / 2], [x0 + t, y1, z + depth / 2], color, o);
  v.span([x1 - t, y0, z - depth / 2], [x1, y1, z + depth / 2], color, o);
  for (const m of mullions) v.span([m - t / 2, y0, z - depth / 2], [m + t / 2, y1, z + depth / 2], color, o);
  if (transom !== null) v.span([x0, transom - t / 2, z - depth / 2], [x1, transom + t / 2, z + depth / 2], color, o);
};

/** Projecting stone sill below an opening. */
export const sill = (v: Vox, x0: number, x1: number, y: number, color: number = C.stoneLight, out = 0.2) => {
  v.span([x0 - 0.12, y - 0.12, -0.05], [x1 + 0.12, y, out], color, { mat: "wet", r: 0.02, jitter: 0.03 });
};

/** Small leafy cluster — a few offset cubes, darker inside, lighter on top. */
export const shrub = (v: Vox, [x, y, z]: V3, size = 0.3, seedShift = 0) => {
  const n = 7 + Math.floor(v.rand() * 4);
  for (let i = 0; i < n; i++) {
    const s = size * (0.45 + v.rand() * 0.4);
    const px = x + (v.rand() - 0.5) * size * 1.2;
    const py = y + v.rand() * size * 0.9;
    const pz = z + (v.rand() - 0.5) * size * 1.0;
    const top = py > y + size * 0.45;
    v.box([px, py, pz], [s, s * 0.85, s], top ? C.leafLight : (i + seedShift) % 2 ? C.leaf : C.leafDark, {
      mat: "foliage",
      jitter: 0.1,
      rot: [0, v.rand() * 0.6, 0],
    });
  }
};

/** Copper downpipe with brackets, from top to bottom along Y. */
export const downpipe = (v: Vox, [x, z]: [number, number], yTop: number, yBottom: number) => {
  v.span([x - 0.06, yBottom + 0.2, z - 0.06], [x + 0.06, yTop, z + 0.06], C.copper, { mat: "metal", r: 0.02 });
  v.span([x - 0.07, yBottom, z - 0.07], [x + 0.07, yBottom + 0.22, z + 0.2], C.copper, { mat: "metal", r: 0.02 });
  for (let y = yBottom + 1.1; y < yTop - 0.3; y += 1.5) {
    v.span([x - 0.09, y, z - 0.12], [x + 0.09, y + 0.05, z + 0.08], C.copperDark, { mat: "metal", r: 0.01 });
  }
};

/** Herb pot detail for close-ups: stems with pairs of flat leaves, turned outward. */
export const herbs = (v: Vox, [x, y, z]: V3, height = 0.22, stems = 5, color: number = C.leaf) => {
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + v.rand() * 0.6;
    const lean = 0.12 + v.rand() * 0.25;
    const h = height * (0.65 + v.rand() * 0.45);
    const top: V3 = [x + Math.cos(a) * h * lean, y + h, z + Math.sin(a) * h * lean];
    v.rod([x, y, z], top, 0.012, C.leafDark, { mat: "foliage" });
    const pairs = 2 + Math.floor(v.rand() * 2);
    for (let k = 0; k < pairs; k++) {
      const t = 0.45 + (k / pairs) * 0.55;
      const p: V3 = [x + (top[0] - x) * t, y + (top[1] - y) * t, z + (top[2] - z) * t];
      for (const side of [-1, 1]) {
        const ya = a + side * 1.3 + k * 0.7;
        const s = 0.05 + (1 - k / pairs) * 0.03;
        v.at(p, [0.35 * side, ya, 0.25], () =>
          v.box([s * 0.55, 0, 0], [s, 0.011, s * 0.62], k === pairs - 1 ? C.leafLight : color, { mat: "foliage", jitter: 0.08, r: 0.004 }),
        );
      }
    }
    v.box([top[0], top[1] + 0.012, top[2]], [0.04, 0.012, 0.035], C.leafLight, { mat: "foliage", rot: [0, a, 0], r: 0.004 });
  }
};

/** Trailing ivy spilling over an edge and hanging down. */
export const ivy = (v: Vox, [x, y, z]: V3, length = 0.4) => {
  let p: V3 = [x, y, z];
  const n = Math.round(length / 0.045);
  for (let i = 0; i < n; i++) {
    const q: V3 = [p[0] + (v.rand() - 0.5) * 0.03, p[1] - 0.045, p[2] + 0.004];
    v.rod(p, q, 0.008, C.leafDark, { mat: "foliage" });
    if (i % 2 === 0) v.box([q[0] + (i % 4 === 0 ? 0.022 : -0.022), q[1], q[2] + 0.01], [0.04, 0.034, 0.008], i % 3 ? C.leaf : C.leafLight, { mat: "foliage", rot: [0.3, 0, i % 4 === 0 ? -0.5 : 0.5], r: 0.003 });
    p = q;
  }
};
