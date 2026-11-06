// The diorama plinth: a street along X (asphalt in patched strips, worn lane marks, an optional zebra
// crossing and tram setts), kerbs and stone-paver walks on both sides, yards behind, puddles, and a
// cut-away base showing soil strata with pebbles and cable ducts, framed in timber. Parametric: one call
// per world. Street centre is z = 0; the plinth top is y = 0 (walks sit at `curb`).

import React from "react";
import { C } from "../lib/palette";
import { VoxModel } from "../lib/components";
import type { Vox } from "../lib/voxel";

export type PlinthSpec = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** half width of the carriageway */
  roadHalf: number;
  /** kerb height */
  curb: number;
  /** outer edge of each walk, measured from the street centre */
  walkOuter: number;
  /** depth of the cut-away base below the street */
  baseDepth: number;
  /** x of a zebra crossing, if any */
  crossingX?: number;
  /** tram setts and rails down the middle */
  tram?: boolean;
  /** puddles: [x, z, width, depth] */
  puddles?: [number, number, number, number][];
};

const ground = (P: PlinthSpec) => (v: Vox) => {
  const { minX, maxX, minZ, maxZ, roadHalf, curb, walkOuter, baseDepth } = P;
  // road: slightly crowned asphalt in long strips with patched sections
  for (let x = minX; x < maxX - 0.01; x += 2)
    for (let z = -roadHalf; z < roadHalf - 0.01; z += 1.6) {
      const patch = v.rand() < 0.12;
      const crown = 0.02 * (1 - Math.abs(z) / roadHalf);
      v.span([x, -0.2, z], [Math.min(x + 2, maxX), crown, Math.min(z + 1.6, roadHalf)], patch ? 0x474b4a : C.asphalt, { mat: "wet", r: 0.005, jitter: 0.05 });
    }
  if (P.tram) {
    for (let x = minX; x < maxX - 0.01; x += 0.3)
      for (let z = -0.9; z < 0.9; z += 0.3) v.span([x + 0.01, 0.0, z + 0.01], [x + 0.29, 0.035, z + 0.29], C.cobble, { mat: "wet", r: 0.02, jitter: 0.12 });
    for (const rz of [-0.72, 0.72]) v.span([minX, 0.035, rz - 0.04], [maxX, 0.07, rz + 0.04], C.stoneLight, { mat: "metal", r: 0.01 });
  } else {
    // worn centre line
    for (let x = minX + 0.6; x < maxX - 1; x += 2.6) v.span([x, 0.02, -0.05], [x + 1.3, 0.03, 0.05], 0xbfb6a0, { mat: "wet", r: 0.004 });
  }
  if (P.crossingX !== undefined)
    for (let z = -roadHalf + 0.3; z < roadHalf - 0.3; z += 0.55)
      v.span([P.crossingX - 0.9, 0.02, z], [P.crossingX + 0.9, 0.035, z + 0.32], 0xd5ccb6, { mat: "wet", r: 0.004, jitter: 0.04 });
  // kerbs and square stone pavers, both sides
  for (const s of [-1, 1]) {
    v.span([minX, -0.2, s > 0 ? roadHalf - 0.1 : -roadHalf - 0.12], [maxX, curb, s > 0 ? roadHalf + 0.12 : -roadHalf + 0.1], C.stoneLight, { mat: "wet", r: 0.02 });
    const z0 = s > 0 ? roadHalf + 0.12 : -walkOuter;
    const z1 = s > 0 ? walkOuter : -roadHalf - 0.12;
    for (let x = minX; x < maxX - 0.01; x += 0.62)
      for (let z = z0; z < z1 - 0.01; z += 0.62)
        v.span([x + 0.015, curb - 0.2, z + 0.015], [Math.min(x + 0.605, maxX), curb, Math.min(z + 0.605, z1)], v.rand() < 0.15 ? C.stoneDark : C.stone, { mat: "wet", r: 0.015, jitter: 0.07 });
    for (let x = minX + 2.5; x < maxX - 1; x += 6.3) v.span([x, 0.0, s * (roadHalf - 0.42)], [x + 0.6, 0.012, s * (roadHalf - 0.08)], C.ink, { mat: "metal" });
    // yards behind the walks so the plinth top is never empty
    const zA = s > 0 ? walkOuter : minZ;
    const zB = s > 0 ? maxZ : -walkOuter;
    if (zB > zA) v.span([minX, -0.2, zA], [maxX, 0.05, zB], C.cobble, { mat: "wet", jitter: 0.03, r: 0.01 });
  }
  // cut-away base: strata, pebbles on the faces, cable ducts, timber edge frame
  const cuts = [...[-0.2, -0.7, -1.6, -2.7].filter((y) => y > -baseDepth + 0.05), -baseDepth];
  const sc = [C.stoneDark, 0x6b5543, 0x5a4636, 0x4b3a2e];
  for (let i = 0; i < cuts.length - 1; i++) v.span([minX, cuts[i + 1], minZ], [maxX, cuts[i], maxZ], sc[Math.min(i, sc.length - 1)], { r: 0.02 });
  const pebbles = Math.round(((maxX - minX) + (maxZ - minZ)) * 5);
  for (let i = 0; i < pebbles; i++) {
    const onFront = v.rand() < 0.6;
    const y = -0.8 - v.rand() * (baseDepth - 1.0);
    const s = 0.08 + v.rand() * 0.16;
    const col = [0x7a6656, 0x8b7a68, 0x5c4a3c][Math.floor(v.rand() * 3)];
    if (onFront) v.box([minX + 0.5 + v.rand() * (maxX - minX - 1), y, maxZ + 0.02], [s, s * 0.7, 0.06], col, { jitter: 0.1 });
    else v.box([minX - 0.02, y, minZ + 0.5 + v.rand() * (maxZ - minZ - 1)], [0.06, s * 0.7, s], col, { jitter: 0.1 });
  }
  for (const [z, y] of [[-roadHalf * 0.5, -1.15], [roadHalf * 0.4, -1.3]] as const)
    v.span([minX - 0.05, y - 0.22, z - 0.22], [maxX + 0.05, y + 0.22, z + 0.22], 0x3b3633, { r: 0.04 });
  v.span([minX - 0.18, -0.25, maxZ], [maxX + 0.18, 0.08, maxZ + 0.18], C.woodDark, { r: 0.02 });
  v.span([minX - 0.18, -0.25, minZ - 0.18], [maxX + 0.18, 0.08, minZ], C.woodDark, { r: 0.02 });
  v.span([minX - 0.18, -0.25, minZ], [minX, 0.08, maxZ], C.woodDark, { r: 0.02 });
  v.span([maxX, -0.25, minZ], [maxX + 0.18, 0.08, maxZ], C.woodDark, { r: 0.02 });
};

/** Mirror-calm puddles: low-roughness plates just above the road or walk. */
const puddles = (P: PlinthSpec) => (v: Vox) => {
  for (const [x, z, w, d] of P.puddles ?? []) {
    const y = Math.abs(z) > P.roadHalf ? P.curb + 0.004 : 0.03;
    v.span([x - w / 2, y - 0.01, z - d / 2], [x + w / 2, y, z + d / 2], 0x262b2b, { mat: "gloss", r: 0.003 });
  }
};

export const Plinth: React.FC<{ spec: PlinthSpec }> = ({ spec }) => (
  <group>
    <VoxModel build={ground(spec)} seed={21} castShadow={false} />
    {spec.puddles?.length ? <VoxModel build={puddles(spec)} seed={22} castShadow={false} /> : null}
  </group>
);
