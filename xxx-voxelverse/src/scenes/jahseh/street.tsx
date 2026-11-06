// The Florida street used by the birth, childhood and memorial scenes.
import React from "react";
import { C } from "../../kits/voxelverse/lib/palette";
import { VoxModel } from "../../kits/voxelverse/lib/components";
import type { Vox } from "../../kits/voxelverse/lib/voxel";
import { Plinth, type PlinthSpec } from "../../kits/voxelverse/world/Plinth";
import { Buildings, type BuildingSpec, type GlowFn, type Placement } from "../../kits/voxelverse/world/Building";
import { Palms, hedge, mailbox, stoop } from "./props";

export const PLINTH: PlinthSpec = { minX: -12, maxX: 12, minZ: -11, maxZ: 9, roadHalf: 2.6, curb: 0.15, walkOuter: 5, baseDepth: 3.2 };
export const north = (cx: number): Placement => ({ pos: [cx, 0, -PLINTH.walkOuter], rotY: 0 });

export const HOUSES: { spec: BuildingSpec; at: Placement }[] = [
  { at: north(-1), spec: { w: 7, depth: 7, ground: 0.9, floors: [3.2], wall: "plaster", wallColor: 0xe9c9a0, trim: C.cream, win: "tall", bays: 2, winW: 1.0, winH: 1.9, roof: "gable", roofColor: C.copper, shop: "none", extras: ["plants", "shutters"], seed: 61 } },
  { at: north(-8), spec: { w: 5.5, depth: 7, ground: 0.9, floors: [3.0], wall: "plaster", wallColor: 0xa9cdc4, trim: C.cream, win: "band", bays: 2, winW: 1.0, winH: 1.5, roof: "flat", roofColor: C.stoneDark, shop: "none", extras: ["ac"], seed: 62 } },
  { at: north(7), spec: { w: 6, depth: 7, ground: 0.9, floors: [3.0], wall: "plaster", wallColor: 0xe8a78c, trim: C.cream, win: "pair", bays: 2, winW: 1.3, winH: 1.5, roof: "gable", roofColor: C.tealDeep, shop: "none", extras: ["shutters", "plants"], seed: 63 } },
];

const yard = (v: Vox) => {
  stoop(v, -1, -5, 0.9);
  stoop(v, -8, -5, 0.9);
  stoop(v, 7, -5, 0.9);
  mailbox(v, [-4.3, 0.05, -4.1]);
  hedge(v, [-5.2, 0.05, -4.3], 2.8);
  hedge(v, [2.9, 0.05, -4.3], 2.4, 0.7, 0.55);
};

const PALMS = [{ p: [-4.8, 0.05, -3.9] as [number, number, number], h: 5.2, lean: 0.5 }, { p: [3.6, 0.05, -4.2] as [number, number, number], h: 4.4, lean: -0.4 }, { p: [9, 0.05, -4] as [number, number, number], h: 5.6, lean: 0.4 }, { p: [-10, 0.05, 3.8] as [number, number, number], h: 4.8, lean: 0.3 }];

export const Street: React.FC<{ f: number; glow: GlowFn }> = ({ f, glow }) => (
  <>
    <Plinth spec={PLINTH} />
    <Buildings list={HOUSES} glow={glow} f={f} />
    <VoxModel build={yard} seed={51} />
    <Palms list={PALMS} />
  </>
);
