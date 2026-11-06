// Look development: Florida golden hour, a voxel house on its plinth, the original character walking
// up to the door and turning toward the camera. 5 s.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PCFShadowMap } from "three";
import { clamp, ease, lerp } from "../../kits/voxelverse/core/motion";
import { C } from "../../kits/voxelverse/lib/palette";
import { VoxModel } from "../../kits/voxelverse/lib/components";
import { cameraAt, type Shot } from "../../kits/voxelverse/camera/rig";
import { CameraRig, Post } from "../../kits/voxelverse/camera/Post";
import { Environment, Fog, Sky } from "../../kits/voxelverse/world/Atmosphere";
import { Plinth, type PlinthSpec } from "../../kits/voxelverse/world/Plinth";
import { Buildings, type BuildingSpec, type Placement } from "../../kits/voxelverse/world/Building";
import { Character } from "./character";
import { GOLDEN, Palms, SunLight, mailbox, hedge, stoop } from "./props";

export const LOOKDEV_SECONDS = 5;
const FILM_FPS = 60;
const s = (x: number) => Math.round(x * FILM_FPS);

const PLINTH: PlinthSpec = { minX: -12, maxX: 12, minZ: -11, maxZ: 9, roadHalf: 2.6, curb: 0.15, walkOuter: 5, baseDepth: 3.2 };
const north = (cx: number): Placement => ({ pos: [cx, 0, -PLINTH.walkOuter], rotY: 0 });

const HOUSES: { spec: BuildingSpec; at: Placement }[] = [
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
type Vox = import("../../kits/voxelverse/lib/voxel").Vox;

const SHOTS: Shot[] = [{
  name: "arrival",
  from: 0, to: s(LOOKDEV_SECONDS),
  keys: [
    { f: 0, pos: [6.5, 2.4, 6.5], at: [-1.0, 2.0, -4], fov: 44 },
    { f: s(2.5), pos: [3.6, 1.7, 1.6], at: [-0.8, 1.7, -4], fov: 38 },
    { f: s(LOOKDEV_SECONDS), pos: [1.5, 1.45, 1.2], at: [0.0, 1.6, -4.0], fov: 36 },
  ],
  focus: (f) => { const x = lerp(5, -0.1, clamp(f / s(3))); return [x, 1.3, -3.5]; },
  aperture: 0.0012, maxBlur: 0.008, exposure: 1.0, fog: 0.004, handheld: 0.003,
}];

const World: React.FC<{ f: number }> = ({ f }) => {
  const cam = cameraAt(SHOTS, f);
  const w = clamp((f - s(0.3)) / s(2.9));
  const x = lerp(5.5, -0.1, ease.body(w));
  const walking = w > 0 && w < 1;
  const turn = ease.body(clamp((f - s(3.2)) / s(0.9)));
  const rotY = lerp(-Math.PI / 2, 0.1, turn);
  return (
    <>
      <CameraRig cam={cam} />
      <Sky look={GOLDEN} boost={1.05} />
      <Environment look={GOLDEN} intensity={0.55} />
      <Fog density={0.004} color={0xe8c49a} />
      <SunLight />
      <Plinth spec={PLINTH} />
      <Buildings list={HOUSES} glow={() => () => 0.2} f={f} />
      <VoxModel build={yard} seed={51} />
      <Palms list={[{ p: [-4.8, 0.05, -3.9], h: 5.2, lean: 0.5 }, { p: [3.6, 0.05, -4.2], h: 4.4, lean: -0.4 }, { p: [9, 0.05, -4], h: 5.6, lean: 0.4 }, { p: [-10, 0.05, 3.8], h: 4.8, lean: 0.3 }]} />
      <Character pos={[x, 0.15, -3.5]} rotY={rotY} pose={{ walk: f * 0.19, amp: walking ? 1 : lerp(1, 0, clamp((f - s(3.2)) / 10)), t: f, headYaw: turn * -0.15, armR: walking ? undefined : [-0.2 * turn, 0.2] }} />
      <Post cam={cam} frame={f} />
    </>
  );
};

export const Lookdev: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const f = (frame / fps) * FILM_FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: "#e8c49a" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: PCFShadowMap }} dpr={1}
        gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.03, far: 600, position: [0, 3, 10] }}>
        <World f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
