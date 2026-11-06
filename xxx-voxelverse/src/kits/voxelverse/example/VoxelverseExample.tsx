// VOXELVERSE technical example — a small voxel street at dusk on its diorama plinth, 8 s at any fps.
// Spec-driven buildings, street lamps, windows that light up in a sweep from west to east, rain that
// starts, and one continuous crane move from street level back and up until the cut-away plinth shows.
// It is a technical check and a starting point, not a story: never reuse it as a buyer's film.
//
// Every time below is a film frame on a 60 fps clock (`f`), so preview (30 fps) and final (60 fps) match.

import React, { useCallback } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PCFShadowMap } from "three";
import { clamp, ease, lerp, ramp } from "../core/motion";
import { hash } from "../core/noise";
import { C } from "../lib/palette";
import { GlowPanes, VoxModel, type Pane } from "../lib/components";
import type { V3, Vox } from "../lib/voxel";
import { cameraAt, type Shot } from "../camera/rig";
import { CameraRig, Post } from "../camera/Post";
import { DuskLight, Environment, Fog, Sky } from "../world/Atmosphere";
import { Plinth, type PlinthSpec } from "../world/Plinth";
import { Buildings, buildingHeight, type BuildingSpec, type GlowFn, type Placement } from "../world/Building";
import { Rain } from "../world/Rain";

export const VOXELVERSE_EXAMPLE_SECONDS = 8;
const FILM_FPS = 60;
const s = (sec: number) => Math.round(sec * FILM_FPS);

const PLINTH: PlinthSpec = {
  minX: -12, maxX: 12, minZ: -13, maxZ: 13,
  roadHalf: 2.6, curb: 0.15, walkOuter: 5, baseDepth: 3.2, crossingX: 3.5,
  puddles: [[-6.5, 1.2, 1.6, 0.6], [2.0, -1.9, 1.2, 0.5], [8.5, 1.6, 1.4, 0.5], [-1.0, 3.6, 0.9, 0.4]],
};

const FRONT = PLINTH.walkOuter;
const north = (cx: number): Placement => ({ pos: [cx, 0, -FRONT], rotY: 0 });
const south = (cx: number): Placement => ({ pos: [cx, 0, FRONT], rotY: Math.PI });

const STREET: { spec: BuildingSpec; at: Placement }[] = [
  { at: north(-8), spec: { w: 7, depth: 7.5, ground: 4.0, floors: [3.2], wall: "brick", wallColor: C.brickDark, trim: C.stoneLight, win: "arched", bays: 4, winW: 1.1, winH: 2.2, roof: "saw", roofColor: C.copperPatina, shop: "depot", extras: ["chimney"], seed: 11 } },
  { at: north(-1.75), spec: { w: 5.5, depth: 7, ground: 3.4, floors: [3.0, 3.0, 3.0], wall: "plaster", wallColor: C.cream, trim: C.teal, win: "tall", bays: 2, winW: 0.9, winH: 1.9, roof: "mansard", roofColor: C.tealDeep, shop: "bakery", shopColor: C.copper, extras: ["balconies", "plants", "shutters"], seed: 12 } },
  { at: north(4.25), spec: { w: 6.5, depth: 7.5, ground: 3.6, floors: [3.2, 3.2], wall: "stone", wallColor: C.stoneLight, trim: C.stoneDark, win: "band", bays: 3, winW: 1.0, winH: 1.6, roof: "stepped", roofColor: C.stone, shop: "arcade", shopColor: C.stoneDark, extras: ["ac"], seed: 13 } },
  { at: north(9.7), spec: { w: 4.4, depth: 7, ground: 3.4, floors: [3.0, 3.0, 3.0, 3.0], wall: "brick", wallColor: C.brick, trim: C.cream, win: "tall", bays: 2, winW: 0.95, winH: 1.8, roof: "flat", roofColor: C.stoneDark, shop: "none", extras: ["fireEscape", "tank", "plants"], seed: 14 } },
  { at: south(-7.8), spec: { w: 8, depth: 7.5, ground: 4.6, floors: [], wall: "stone", wallColor: C.stone, trim: C.copper, win: "arched", bays: 4, winW: 1.4, winH: 2.6, roof: "gable", roofColor: C.copperPatina, shop: "market", shopColor: C.copper, seed: 21 } },
  { at: south(-0.8), spec: { w: 6, depth: 7, ground: 3.8, floors: [3.2, 3.2], wall: "brick", wallColor: C.brickLight, trim: C.cream, win: "arched", bays: 3, winW: 1.1, winH: 1.9, roof: "mansard", roofColor: C.copperDark, shop: "bakery", shopColor: C.teal, extras: ["shutters", "plants", "chimney"], seed: 22 } },
  { at: south(7.0), spec: { w: 9.6, depth: 7.5, ground: 3.6, floors: [3.1, 3.1], wall: "plaster", wallColor: C.plasterRose, trim: C.creamDark, win: "pair", bays: 3, winW: 1.5, winH: 1.5, roof: "flat", roofColor: C.copperPatina, shop: "workshop", shopColor: C.tealDeep, extras: ["tower", "ac"], seed: 23 } },
];

/** Rain stays out of the buildings: a point is blocked if it is inside a footprint below the roofline. */
const FOOTPRINTS = STREET.map(({ spec, at }) => {
  const zs = [at.pos[2], at.pos[2] - Math.cos(at.rotY) * spec.depth];
  return { x0: at.pos[0] - spec.w / 2, x1: at.pos[0] + spec.w / 2, z0: Math.min(...zs), z1: Math.max(...zs), top: buildingHeight(spec) + 3 };
});
const blocked = (x: number, y: number, z: number) => FOOTPRINTS.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.top);
const groundY = (_x: number, z: number) => (Math.abs(z) > PLINTH.roadHalf ? PLINTH.curb : 0.035);

/** Windows light up in a sweep from west to east between 1.2 s and 4.5 s; a few are lit from the start. */
const windowGlow: GlowFn = ({ pos, floor, seed, shop }) => {
  const strength = shop ? 1 : 0.75 + hash(seed * 7) * 0.6;
  if (!shop && hash(seed * 3 + 1) < 0.12) return () => strength;
  if (!shop && hash(seed * 5 + 2) > 0.85) return () => 0;
  const start = s(1.2) + ((pos[0] - PLINTH.minX) / (PLINTH.maxX - PLINTH.minX)) * s(3.0) + floor * 6 + hash(seed) * 24;
  // a switch-on with one quick flicker, then steady
  return (f) => {
    const t = f - start;
    if (t < 0) return 0;
    if (t < 3) return strength * 0.6;
    if (t < 6) return strength * 0.15;
    return strength * Math.min(1, 0.6 + (t - 6) * 0.05);
  };
};

/* street lamps: a post on each walk, lamp heads as glow panes, real point lights for the pools */
const LAMPS: [number, number][] = [[-6, -1], [-1.5, 1], [4.5, -1], [9.5, 1]].map(([x, side]) => [x, side * (PLINTH.roadHalf + 0.45)]);
const lampPosts = (v: Vox) => {
  for (const [x, z] of LAMPS) {
    const out = z < 0 ? 1 : -1; // the arm reaches over the road
    v.prism([x, PLINTH.curb + 0.15, z], 0.16, 0.3, C.ink, { sides: 8, mat: "metal" });
    v.span([x - 0.05, PLINTH.curb, z - 0.05], [x + 0.05, 4.2, z + 0.05], C.ink, { mat: "metal", r: 0.015 });
    v.span([x - 0.04, 4.1, z], [x + 0.04, 4.18, z + out * 0.8], C.ink, { mat: "metal", r: 0.01 });
    v.span([x - 0.16, 3.98, z + out * 0.62], [x + 0.16, 4.1, z + out * 0.98], C.ink, { mat: "metal", r: 0.02 });
  }
};
const LAMP_ON = s(0.8);
const lampLevel = (f: number) => {
  const t = f - LAMP_ON;
  return t < 0 ? 0 : t < 3 ? 0.5 : t < 6 ? 0.1 : clamp(0.5 + (t - 6) * 0.04);
};
const LAMP_PANES: Pane[] = LAMPS.map(([x, z]): Pane => {
  const out = z < 0 ? 1 : -1;
  const pos: V3 = [x, 3.975, z + out * 0.8];
  return { pos, size: [0.28, 0.3], rotY: 0, tint: 0xffcf86, glow: (f) => 3 * lampLevel(f) };
});

/* camera: one continuous crane from street level, back past the plinth edge and up */
const SHOTS: Shot[] = [
  {
    name: "street to diorama",
    from: 0,
    to: s(VOXELVERSE_EXAMPLE_SECONDS),
    keys: [
      { f: 0, pos: [-9.5, 1.7, -3.6], at: [-2, 3.2, 5], fov: 44 },
      { f: s(3.0), pos: [-11, 3.4, -2.5], at: [-1, 3.4, 4], fov: 43 },
      { f: s(5.4), pos: [-23, 13, 1], at: [1, 2, 1], fov: 41 },
      { f: s(VOXELVERSE_EXAMPLE_SECONDS), pos: [-44, 32, 5], at: [2, 0, 0], fov: 40 },
    ],
    focus: (f) => (f < s(3) ? [-2, 3, 5] : [0, 1.5, 0]),
    aperture: (f) => lerp(0.0018, 0.0004, clamp((f - s(2.5)) / s(3))),
    maxBlur: 0.01,
    exposure: 1.0,
    fog: 0.012,
    handheld: 0.004,
  },
];

const World: React.FC<{ f: number }> = ({ f }) => {
  const cam = cameraAt(SHOTS, f);
  const k = ease.cameraSoft(clamp(f / s(VOXELVERSE_EXAMPLE_SECONDS)));
  const glow = useCallback<GlowFn>((p) => windowGlow(p), []);
  const rain = ramp(f, s(2.2), s(3.6));
  const lamp = lampLevel(f);
  return (
    <>
      <CameraRig cam={cam} />
      <Sky boost={1 - 0.3 * k} />
      <Environment />
      <Fog density={lerp(0.014, 0.0028, k)} />
      <DuskLight from={[-16, 30, 26]} size={22} intensity={1.1 - 0.3 * k} />
      <Plinth spec={PLINTH} />
      <Buildings list={STREET} glow={glow} f={f} />
      <VoxModel build={lampPosts} seed={31} />
      <GlowPanes panes={LAMP_PANES} f={f} />
      {LAMPS.map(([x, z], i) => (
        <pointLight key={i} position={[x, 3.7, z + (z < 0 ? 0.8 : -0.8)]} color={C.lampWarm} intensity={lamp * 7} distance={7} decay={2} />
      ))}
      <Rain cam={cam} f={f} amount={rain * 0.55} wide={rain * k * 0.7} bounds={{ minX: PLINTH.minX, maxX: PLINTH.maxX, minZ: PLINTH.minZ, maxZ: PLINTH.maxZ, height: 22 }} blocked={blocked} groundY={groundY} />
      <Post cam={cam} frame={f} />
    </>
  );
};

export const VoxelverseExample: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const f = (frame / fps) * FILM_FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1d2a2b" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: PCFShadowMap }} dpr={1}
        gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        camera={{ fov: 44, near: 0.03, far: 600, position: [0, 3, 10] }}>
        <World f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
