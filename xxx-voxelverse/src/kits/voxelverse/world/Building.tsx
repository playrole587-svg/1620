// Spec-driven voxel buildings: proportions, wall type, window rhythm, roof, shopfront and extras are
// data; the model is assembled from the voxel kit (brick or stone walls with cut openings, framed windows,
// sills, arches, shutters, balconies, fire escapes, roofs of five kinds, tanks, chimneys, a clock tower).
// Windows become instanced glow panes whose light is a pure function of the frame.

import React, { useMemo } from "react";
import { C } from "../lib/palette";
import { VoxModel, GlowPanes, type Pane } from "../lib/components";
import { brickWall, sill, shrub, slabWithHoles, windowFrame, downpipe, type Hole } from "../lib/kit";
import type { Vox, V3 } from "../lib/voxel";
import { interiorAtlas } from "../lib/textures";
import { hash } from "../core/noise";

export type WinStyle = "tall" | "square" | "arched" | "pair" | "band" | "round";
export type Roof = "flat" | "gable" | "saw" | "mansard" | "stepped";
export type Shop = "none" | "workshop" | "bakery" | "cinema" | "market" | "arcade" | "depot";

export type BuildingSpec = {
  /** façade width (x) and depth behind the façade (−z) */
  w: number;
  depth: number;
  /** ground-floor height and upper floor heights */
  ground: number;
  floors: number[];
  wall: "brick" | "plaster" | "stone";
  wallColor: number;
  trim: number;
  win: WinStyle;
  bays: number;
  winW: number;
  winH: number;
  roof: Roof;
  roofColor: number;
  shop: Shop;
  shopColor?: number;
  extras?: ("balconies" | "fireEscape" | "shutters" | "ac" | "tank" | "plants" | "awning" | "vent" | "chimney" | "tower")[];
  seed: number;
};

/** Where a building stands: façade centre on the ground, and its turn about Y (0 = façade faces +Z). */
export type Placement = { pos: V3; rotY: number };

export const buildingHeight = (b: BuildingSpec) => b.ground + b.floors.reduce((a, c) => a + c, 0);

/** Voxel model of a building, authored with its façade on z = 0 facing +Z, centred on x = 0. */
export const buildingModel = (b: BuildingSpec) => (v: Vox) => {
  const W = b.w;
  const hw = W / 2;
  const H = b.ground + b.floors.reduce((a, c) => a + c, 0);
  const D = b.depth;
  const has = (e: NonNullable<BuildingSpec["extras"]>[number]) => b.extras?.includes(e);

  // Back and side walls: simple solids so roofs and silhouettes read from above.
  v.span([-hw, 0, -D], [hw, H, -0.3], b.wallColor, { jitter: 0.02 });

  // Ground floor / shopfront
  const g = b.ground;
  const shopHoles: Hole[] = [];
  if (b.shop === "market") {
    for (let i = 0; i < b.bays; i++) {
      const cx = -hw + (W / b.bays) * (i + 0.5);
      shopHoles.push([cx - 0.85, cx + 0.85, 0, g - 1.0]);
    }
  } else if (b.shop === "depot") {
    shopHoles.push([-hw + 1.0, -hw + 4.2, 0, 3.4]);
  } else if (b.shop !== "none") {
    shopHoles.push([-hw + 0.5, hw - 0.5, 0.6, g - 0.85]);
  }
  if (b.wall === "brick") {
    brickWall(v, -hw, hw, 0, g, shopHoles.map((h) => [h[0], h[1], h[2] === 0.6 ? 0 : h[2], h[3]] as Hole), { back: 0.3 });
  } else {
    // rusticated stone base: chunky blocks
    slabWithHoles(v, -hw, hw, 0, g, -0.3, 0, shopHoles.map((h) => [h[0], h[1], h[2] === 0.6 ? 0 : h[2], h[3]] as Hole), b.wall === "stone" ? b.wallColor : b.trim);
    for (let y = 0.05; y < g - 0.3; y += 0.5) {
      for (let x = -hw; x < hw; x += 0.9) {
        const xa = x + ((y * 2) % 2 ? 0.45 : 0);
        const inHole = shopHoles.some((h) => xa + 0.85 > h[0] && xa < h[1] && y + 0.45 > h[2] && y < h[3]);
        if (inHole) continue;
        v.span([Math.max(-hw, xa + 0.02), y, 0], [Math.min(hw, xa + 0.88), y + 0.45, 0.06], b.wall === "stone" ? b.wallColor : C.stoneLight, { jitter: 0.05, r: 0.03 });
      }
    }
  }
  // Shopfront fittings
  if (b.shop === "bakery" || b.shop === "workshop" || b.shop === "arcade" || b.shop === "cinema") {
    const sc = b.shopColor ?? C.tealDeep;
    v.span([-hw + 0.5, 0, -0.2], [hw - 0.5, 0.6, 0.02], sc, { mat: "satin" });
    v.span([-hw + 0.45, g - 0.85, -0.2], [hw - 0.45, g - 0.15, 0.08], sc, { mat: "satin" }); // fascia
    v.span([-hw + 0.4, g - 0.15, -0.2], [hw - 0.4, g - 0.05, 0.14], b.trim, {});
    const n = Math.max(2, Math.round((W - 1) / 1.6));
    for (let i = 0; i <= n; i++) {
      const x = -hw + 0.5 + ((W - 1) / n) * i;
      v.span([x - 0.05, 0.6, -0.18], [x + 0.05, g - 0.85, -0.04], sc, { mat: "satin" });
    }
    if (b.shop === "workshop") {
      // roll-up door: ribbed shutter half-raised
      for (let y = 1.4; y < g - 0.9; y += 0.12) v.span([-hw + 0.6, y, -0.12], [-hw + 0.6 + W * 0.45, y + 0.09, -0.06], C.stoneLight, { mat: "metal" });
    }
    if (b.shop === "arcade") {
      for (let i = 0; i <= 3; i++) {
        const x = -hw + 0.3 + ((W - 0.6) / 3) * i;
        v.span([x - 0.22, 0, 0], [x + 0.22, g - 0.6, 0.3], b.wallColor, { jitter: 0.03 });
      }
    }
  }
  if (b.shop === "depot") {
    // big timber doors, one ajar
    v.span([-hw + 1.05, 0, -0.25], [-hw + 2.6, 3.35, -0.15], C.woodDark, { jitter: 0.05 });
    v.at([-hw + 4.15, 0, -0.2], [0, -0.5, 0], () => v.span([-1.5, 0, -0.05], [0, 3.35, 0.05], C.wood, { jitter: 0.05 }));
    for (let y = 0.4; y < 3.3; y += 0.7) v.span([-hw + 1.05, y, -0.15], [-hw + 2.6, y + 0.08, -0.1], C.ink, { mat: "metal" });
    v.span([-hw + 0.9, 3.4, 0], [-hw + 4.3, 3.75, 0.12], C.stoneLight, {});
  }
  if (b.shop === "market") {
    for (const h of shopHoles) {
      // arched openings: stepped voxel arch + iron grille
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const off = 0.85 * (1 - Math.cos((t * Math.PI) / 2));
        v.span([h[0] - 0.05, h[3] - 0.1 + t * 0.6, -0.02], [h[0] + off * 0.6, h[3] + t * 0.6 + 0.06, 0.08], C.stoneLight, {});
        v.span([h[1] - off * 0.6, h[3] - 0.1 + t * 0.6, -0.02], [h[1] + 0.05, h[3] + t * 0.6 + 0.06, 0.08], C.stoneLight, {});
      }
      for (let x = h[0] + 0.2; x < h[1]; x += 0.22) v.span([x - 0.015, 0, -0.1], [x + 0.015, h[3] - 0.1, -0.07], C.ink, { mat: "metal" });
    }
  }
  if (b.shop === "cinema") {
    // marquee canopy projecting over the walk
    v.span([-hw + 0.8, g - 0.95, 0], [hw - 0.8, g - 0.6, 1.7], C.tealDeep, { mat: "satin" });
    v.span([-hw + 0.7, g - 0.62, -0.1], [hw - 0.7, g - 0.55, 1.8], C.copper, { mat: "metal" });
    v.span([-hw + 0.8, g - 1.05, 1.62], [hw - 0.8, g - 0.95, 1.72], C.copperDark, { mat: "metal" });
    // tall vertical sign blade
    v.span([-0.3, g + 0.2, 0], [0.3, g + 5.2, 0.9], C.tealDeep, { mat: "satin" });
    v.span([-0.34, g + 0.15, 0.85], [0.34, g + 5.25, 0.95], C.copper, { mat: "metal" });
  }

  // Upper floors
  let y = g;
  b.floors.forEach((fh, fi) => {
    const holes: Hole[] = [];
    const bayW = W / b.bays;
    for (let i = 0; i < b.bays; i++) {
      const cx = -hw + bayW * (i + 0.5);
      if (b.shop === "cinema" && fi < 2 && Math.abs(cx) < 0.9) continue;
      const y0 = y + (fh - b.winH) * 0.45;
      if (b.win === "pair") {
        holes.push([cx - b.winW / 2, cx - 0.06, y0, y0 + b.winH], [cx + 0.06, cx + b.winW / 2, y0, y0 + b.winH]);
      } else if (b.win === "band") {
        holes.push([cx - bayW / 2 + 0.18, cx + bayW / 2 - 0.18, y0 + 0.2, y0 + b.winH]);
      } else {
        holes.push([cx - b.winW / 2, cx + b.winW / 2, y0, y0 + b.winH]);
      }
    }
    if (b.wall === "brick") brickWall(v, -hw, hw, y, y + fh, holes, { back: 0.3 });
    else {
      slabWithHoles(v, -hw, hw, y, y + fh, -0.3, 0, holes, b.wallColor);
      // string course at each floor line
      v.span([-hw - 0.04, y - 0.08, -0.05], [hw + 0.04, y + 0.08, 0.1], b.trim, { jitter: 0.02 });
    }
    for (const h of holes) {
      const isRound = b.win === "round";
      windowFrame(v, h, { color: b.trim, z: -0.13, mullions: h[1] - h[0] > 1.0 && b.win !== "band" ? [(h[0] + h[1]) / 2] : b.win === "band" ? [h[0] + (h[1] - h[0]) / 3, h[0] + (2 * (h[1] - h[0])) / 3] : [], transom: b.win === "tall" || b.win === "arched" ? h[3] - 0.45 : null });
      if (b.win !== "band") sill(v, h[0], h[1], h[2], b.wall === "brick" ? C.stoneLight : b.trim, 0.16);
      if (b.win === "arched" || isRound) {
        // voxel arch: stepped header over the opening
        const w = h[1] - h[0];
        for (let i = 0; i < 4; i++) v.span([h[0] + (i * w) / 9, h[3] + i * 0.07, -0.02], [h[1] - (i * w) / 9, h[3] + (i + 1) * 0.07, 0.07], b.wall === "brick" ? C.brickDark : b.trim, { jitter: 0.03 });
      } else if (b.wall === "brick") {
        for (let x = h[0] - 0.1; x < h[1] + 0.05; x += 0.15) v.box([x + 0.06, h[3] + 0.17, 0.03], [0.12, 0.32, 0.11], C.brickDark, { jitter: 0.08, r: 0.02 });
      } else {
        v.span([h[0] - 0.1, h[3], -0.02], [h[1] + 0.1, h[3] + 0.16, 0.08], b.trim, {});
      }
      if (has("shutters") && b.win !== "band" && b.win !== "pair") {
        const w2 = (h[1] - h[0]) * 0.5;
        for (const [a, c] of [[h[0] - w2 - 0.04, h[0] - 0.04], [h[1] + 0.04, h[1] + w2 + 0.04]]) {
          v.span([a, h[2], 0.02], [c, h[3], 0.07], b.trim === C.cream ? C.teal : b.trim, { mat: "satin", jitter: 0.04 });
          for (let yy = h[2] + 0.1; yy < h[3] - 0.05; yy += 0.15) v.span([a + 0.03, yy, 0.07], [c - 0.03, yy + 0.05, 0.09], C.tealDeep, { mat: "satin" });
        }
      }
      if (has("plants") && hash(b.seed * 31 + Math.round(h[0] * 10 + y)) < 0.45) {
        v.span([h[0] + 0.05, h[2] + 0.0, 0.05], [h[1] - 0.05, h[2] + 0.18, 0.25], C.wood, { jitter: 0.05 });
        shrub(v, [(h[0] + h[1]) / 2, h[2] + 0.24, 0.15], Math.min(0.3, (h[1] - h[0]) * 0.3), fi);
      }
      if (has("ac") && hash(b.seed * 17 + Math.round(h[0] * 7 + y)) < 0.35) {
        v.span([h[1] - 0.6, h[2] - 0.55, 0.0], [h[1] - 0.05, h[2] - 0.15, 0.32], C.cream, { mat: "satin" });
        for (let k = 0; k < 4; k++) v.span([h[1] - 0.55, h[2] - 0.5 + k * 0.08, 0.32], [h[1] - 0.25, h[2] - 0.47 + k * 0.08, 0.33], C.stoneDark, {});
      }
    }
    if (has("balconies") && fi >= 0 && fi < b.floors.length) {
      for (const h of holes.filter((_, i) => i % 2 === 0)) {
        const bx0 = h[0] - 0.25, bx1 = h[1] + 0.25;
        v.span([bx0, h[2] - 0.12, 0], [bx1, h[2], 0.75], C.stoneLight, { mat: "wet" });
        for (let x = bx0 + 0.05; x <= bx1; x += 0.16) v.span([x, h[2], 0.69], [x + 0.03, h[2] + 0.7, 0.72], C.ink, { mat: "metal" });
        v.span([bx0, h[2] + 0.68, 0.67], [bx1, h[2] + 0.74, 0.75], C.ink, { mat: "metal" });
        for (const sx of [bx0, bx1 - 0.03]) for (let z = 0.05; z < 0.7; z += 0.16) v.span([sx, h[2], z], [sx + 0.03, h[2] + 0.7, z + 0.03], C.ink, { mat: "metal" });
        if (hash(b.seed + Math.round(h[0] * 13) + fi) < 0.6) shrub(v, [bx0 + 0.3, h[2] + 0.15, 0.45], 0.28, fi + 1);
      }
    }
    y += fh;
  });

  // Fire escape: landings + zig-zag stairs on the middle bays.
  if (has("fireEscape")) {
    let fy = b.ground;
    b.floors.forEach((fh, i) => {
      const x0 = -hw + W * 0.32, x1 = hw - W * 0.12;
      const ly = fy + 0.05;
      v.span([x0, ly, 0.02], [x1, ly + 0.06, 0.9], C.ink, { mat: "metal" });
      for (let x = x0; x <= x1; x += 0.2) v.span([x, ly + 0.06, 0.86], [x + 0.025, ly + 0.95, 0.89], C.ink, { mat: "metal" });
      v.span([x0, ly + 0.92, 0.84], [x1, ly + 0.97, 0.9], C.ink, { mat: "metal" });
      // stair down to the next landing
      if (i > 0) {
        const steps = 9;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const sx = (i % 2 ? x0 + 0.2 : x1 - 0.8) + (i % 2 ? t : 1 - t) * 0.6 * 1.0;
          v.span([sx, ly - fh * t, 0.12], [sx + 0.22, ly - fh * t + 0.04, 0.78], C.ink, { mat: "metal" });
        }
        v.at([(x0 + x1) / 2 + (i % 2 ? -0.4 : 0.4), ly - fh / 2, 0.8], [0, 0, (i % 2 ? 1 : -1) * Math.atan2(fh, 1.4)], () => v.box([0, 0, 0], [0.05, Math.hypot(fh, 1.4) + 0.1, 0.05], C.ink, { mat: "metal" }));
      }
      fy += fh;
    });
  }

  // Roofs
  const rc = b.roofColor;
  if (b.roof === "flat" || b.roof === "stepped") {
    v.span([-hw - 0.08, H - 0.15, -0.3], [hw + 0.08, H + 0.15, 0.18], b.trim, { mat: "wet" });
    v.span([-hw, H + 0.15, -0.3], [hw, H + 0.6, -0.05], b.wall === "brick" ? b.wallColor : b.trim, { jitter: 0.02 });
    v.span([-hw, H, -D], [hw, H + 0.12, -0.3], rc, { mat: "wet" });
    if (b.roof === "stepped") {
      v.span([-hw + 1, H, -D + 0.5], [hw - 1, H + 1.3, -1.8], b.wallColor, {});
      v.span([-hw + 0.9, H + 1.3, -D + 0.4], [hw - 0.9, H + 1.45, -1.7], b.trim, { mat: "wet" });
      v.span([-hw + 2.2, H + 1.45, -D + 1.6], [hw - 2.2, H + 2.4, -3.2], b.wallColor, {});
      v.span([-hw + 2.1, H + 2.4, -D + 1.5], [hw - 2.1, H + 2.52, -3.1], rc, { mat: "wet" });
    }
  } else if (b.roof === "gable") {
    // stepped voxel gable running along X, tiles in rows
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const inset = (D / 2) * (i / steps);
      v.span([-hw - 0.15, H + i * 0.42, -D - 0.15 + inset], [hw + 0.15, H + (i + 1) * 0.42, 0.15 - inset], i % 2 ? rc : rc, { mat: "wet", jitter: 0.04, r: 0.04 });
    }
    v.span([-hw - 0.2, H + steps * 0.42, -D / 2 - 0.25], [hw + 0.2, H + steps * 0.42 + 0.12, -D / 2 + 0.25], b.trim, { mat: "metal" });
  } else if (b.roof === "mansard") {
    v.span([-hw - 0.1, H - 0.1, -0.3], [hw + 0.1, H + 0.12, 0.2], b.trim, { mat: "wet" });
    for (let i = 0; i < 4; i++) v.span([-hw + i * 0.12, H + 0.12 + i * 0.55, -D + i * 0.15], [hw - i * 0.12, H + 0.12 + (i + 1) * 0.55, -0.1 - i * 0.28], rc, { mat: "wet", jitter: 0.03, r: 0.03 });
    // dormers
    const n = Math.max(1, b.bays - 1);
    for (let i = 0; i < n; i++) {
      const cx = -hw + (W / n) * (i + 0.5);
      v.span([cx - 0.45, H + 0.4, -0.95], [cx + 0.45, H + 1.5, -0.25], b.trim, {});
      v.span([cx - 0.55, H + 1.5, -1.0], [cx + 0.55, H + 1.65, -0.15], rc, { mat: "wet" });
    }
  } else if (b.roof === "saw") {
    v.span([-hw, H, -D], [hw, H + 0.12, -0.2], C.stoneDark, {});
    const n = 4;
    for (let i = 0; i < n; i++) {
      const z0 = -D + (D / n) * i + 0.1, z1 = z0 + D / n - 0.1;
      for (let k = 0; k < 5; k++) {
        const t = k / 5;
        v.span([-hw + 0.1, H + 0.12 + t * 1.6, z0 + (z1 - z0) * t], [hw - 0.1, H + 0.12 + (t + 0.2) * 1.6, z1], rc, { mat: "wet", r: 0.03, jitter: 0.03 });
      }
      v.span([-hw + 0.2, H + 0.2, z0 - 0.04], [hw - 0.2, H + 1.7, z0 + 0.04], C.tealDeep, { mat: "gloss" });
    }
    v.span([-hw - 0.1, H - 0.2, -0.3], [hw + 0.1, H + 0.6, 0.12], b.wallColor, { jitter: 0.03 });
  }
  if (has("tank")) {
    v.at([hw - 1.6, H + 0.12, -D + 2.2], 0.2, () => {
      for (const [lx, lz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) v.span([lx - 0.06, 0, lz - 0.06], [lx + 0.06, 0.9, lz + 0.06], C.woodDark, {});
      v.prism([0, 1.6, 0], 0.75, 1.3, C.wood, { sides: 12, jitter: 0.03 });
      v.prism([0, 2.4, 0], 0.4, 0.3, C.copperDark, { sides: 12, mat: "metal" });
    });
  }
  if (has("chimney")) {
    for (const cx of [-hw + 0.9, hw - 1.3]) {
      v.span([cx - 0.3, H, -D * 0.6], [cx + 0.3, H + 2.8, -D * 0.6 + 0.6], b.wall === "brick" ? C.brickDark : C.stoneDark, { jitter: 0.04 });
      v.span([cx - 0.36, H + 2.8, -D * 0.6 - 0.06], [cx + 0.36, H + 2.95, -D * 0.6 + 0.66], C.stoneLight, {});
      v.prism([cx, H + 3.1, -D * 0.6 + 0.3], 0.1, 0.3, C.copperDark, { sides: 8, mat: "metal" });
    }
  }
  if (has("vent")) {
    v.span([-0.8, H + 0.12, -D + 1.5], [0.8, H + 0.9, -D + 3.1], C.stoneLight, { mat: "metal" });
  }
  if (has("tower")) {
    // clock tower rising from the east end
    const tx = hw - 2.2, tz = -3.2;
    v.span([tx - 1.6, H, tz - 1.6], [tx + 1.6, H + 8.5, tz + 1.6], b.wallColor, { jitter: 0.02 });
    for (let k = 0; k < 4; k++) v.span([tx - 1.7, H + 1.5 + k * 2, tz - 1.7], [tx + 1.7, H + 1.62 + k * 2, tz + 1.7], b.trim, { mat: "metal" });
    v.span([tx - 1.85, H + 8.5, tz - 1.85], [tx + 1.85, H + 8.8, tz + 1.85], C.stoneLight, { mat: "wet" });
    for (let i = 0; i < 5; i++) v.span([tx - 1.4 + i * 0.28, H + 8.8 + i * 0.5, tz - 1.4 + i * 0.28], [tx + 1.4 - i * 0.28, H + 9.3 + i * 0.5, tz + 1.4 - i * 0.28], C.copperPatina, { mat: "metal", r: 0.03 });
    v.span([tx - 0.05, H + 11.2, tz - 0.05], [tx + 0.05, H + 12.6, tz + 0.05], C.copperDark, { mat: "metal" });
    // clock face surrounds (the faces themselves glow)
    v.span([tx - 1.05, H + 5.2, tz + 1.6], [tx + 1.05, H + 7.3, tz + 1.72], C.copperDark, { mat: "metal" });
    v.span([tx - 1.72, H + 5.2, tz - 1.05], [tx - 1.6, H + 7.3, tz + 1.05], C.copperDark, { mat: "metal" });
  }
  // a downpipe on every other building
  if (hash(b.seed) < 0.6) downpipe(v, [hw - 0.2, 0.12], H - 0.1, 0);
};

/** What a pane needs to decide its light: world position, floor (−1 = shop), a stable seed. */
export type PaneInfo = { pos: V3; floor: number; seed: number; shop: boolean };
/** Returns the pane's emission (0 = dark, ~1 = lit) as a function of the film frame. */
export type GlowFn = (p: PaneInfo) => (f: number) => number;

const toWorld = (at: Placement, p: V3): V3 => {
  const c = Math.cos(at.rotY), s = Math.sin(at.rotY);
  return [at.pos[0] + p[0] * c + p[2] * s, at.pos[1] + p[1], at.pos[2] - p[0] * s + p[2] * c];
};

/** Glow panes for a building's windows and shopfront, in world space. */
export const buildingPanes = (b: BuildingSpec, at: Placement, glow: GlowFn): Pane[] => {
  const W = b.w;
  const hw = W / 2;
  const out: Pane[] = [];
  const warmth = [0xffc287, 0xffb070, 0xffd3a4, 0xffa860, 0xf6d9b0];
  let y = b.ground;
  let n = 0;
  b.floors.forEach((fh, fi) => {
    const bayW = W / b.bays;
    for (let i = 0; i < b.bays; i++) {
      const cx = -hw + bayW * (i + 0.5);
      if (b.shop === "cinema" && fi < 2 && Math.abs(cx) < 0.9) continue;
      const y0 = y + (fh - b.winH) * 0.45;
      const rects: [number, number, number, number][] =
        b.win === "pair"
          ? [[cx - b.winW / 2, cx - 0.06, y0, y0 + b.winH], [cx + 0.06, cx + b.winW / 2, y0, y0 + b.winH]]
          : b.win === "band"
            ? [[cx - bayW / 2 + 0.18, cx + bayW / 2 - 0.18, y0 + 0.2, y0 + b.winH]]
            : [[cx - b.winW / 2, cx + b.winW / 2, y0, y0 + b.winH]];
      for (const r of rects) {
        const seed = b.seed * 100 + n++;
        const pos = toWorld(at, [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2, -0.17]);
        out.push({
          pos,
          size: [r[1] - r[0] - 0.08, r[3] - r[2] - 0.08],
          rotY: at.rotY,
          tint: warmth[Math.floor(hash(seed * 11) * warmth.length)],
          cell: Math.floor(hash(seed * 13) * 4) as 0 | 1 | 2 | 3,
          glow: glow({ pos, floor: fi, seed, shop: false }),
        });
      }
    }
    y += fh;
  });
  if (b.shop !== "none" && b.shop !== "market" && b.shop !== "depot") {
    const seed = b.seed * 100 + 99;
    const pos = toWorld(at, [0, (0.6 + b.ground - 0.85) / 2, -0.22]);
    const g = glow({ pos, floor: -1, seed, shop: true });
    out.push({ pos, size: [W - 1.2, b.ground - 0.85 - 0.6 - 0.05], rotY: at.rotY, tint: 0xffc890, cell: 3, glow: (f) => 1.3 * g(f) });
  }
  if (b.shop === "market" || b.shop === "depot") {
    const seed = b.seed * 100 + 98;
    const pos = toWorld(at, [0, b.ground * 0.4, -1.2]);
    const g = glow({ pos, floor: -1, seed, shop: true });
    out.push({ pos, size: [W - 1.0, b.ground * 0.8], rotY: at.rotY, tint: 0xffb878, cell: 0, glow: (f) => 0.9 * g(f) });
  }
  return out;
};

/** A row of buildings with all their glow panes in one instanced draw call. */
export const Buildings: React.FC<{ list: { spec: BuildingSpec; at: Placement }[]; glow: GlowFn; f?: number }> = ({ list, glow, f }) => {
  const panes = useMemo(() => list.flatMap(({ spec, at }) => buildingPanes(spec, at, glow)), [list, glow]);
  const atlas = useMemo(interiorAtlas, []);
  return (
    <group>
      {list.map(({ spec, at }, i) => (
        <group key={i} position={at.pos} rotation={[0, at.rotY, 0]}>
          <VoxModel build={buildingModel(spec)} seed={spec.seed} />
        </group>
      ))}
      <GlowPanes panes={panes} atlas={atlas} f={f} />
    </group>
  );
};
