// Scene 3: a small bedroom studio — monitor glow, mic with pop filter, foam panels, string lights, night window.
import React from "react";
import { ease, clamp, ramp } from "../../kits/voxelverse/core/motion";
import { hash } from "../../kits/voxelverse/core/noise";
import { C } from "../../kits/voxelverse/lib/palette";
import { GlowPanes, VoxModel, type Pane } from "../../kits/voxelverse/lib/components";
import { slabWithHoles, windowFrame } from "../../kits/voxelverse/lib/kit";
import type { Vox } from "../../kits/voxelverse/lib/voxel";
import { Character } from "./character";
import { Halo, SceneShell, sec, type Shell } from "./common";

const WALL = 0xd2bf9f;
const room = (v: Vox) => {
  // floor boards
  for (let x = -4.3; x < 4.3; x += 0.55) v.span([x, -0.3, -3.3], [x + 0.53, 0, 3.4], x % 1.1 < 0.55 ? 0x80583a : 0x8f6644, { mat: "satin", r: 0.01, jitter: 0.04 });
  // back wall with the window, left wall
  slabWithHoles(v, -4.3, 4.3, 0, 3.8, -3.3, -3.0, [[1.0, 3.2, 0.95, 2.95]], WALL);
  v.span([-4.3, 0, -3.3], [-4.0, 3.8, 3.4], 0xc7b390, {});
  v.span([-4.3, 3.78, -3.3], [4.3, 3.9, -3.0], C.woodDark, {});
  v.span([-4.0, 0, -3.0], [4.3, 0.18, -2.93], C.cream, {});
  v.at([0, 0, -2.95], 0, () => windowFrame(v, [1.0, 3.2, 0.95, 2.95], { color: C.cream, z: 0, t: 0.1, depth: 0.2, mullions: [2.1], transom: 2.3 }));
  v.span([0.9, 0.85, -3.0], [3.3, 0.95, -2.7], C.cream, { mat: "wet" });
  // acoustic foam behind the mic
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) v.box([-1.55 + i * 0.5, 1.2 + j * 0.5, -2.88], [0.46, 0.46, 0.12], (i + j) % 2 ? 0x2f4d4c : 0x24393a, { mat: "fabric", r: 0.03 });
  // rug + bed along the left wall
  v.span([-1.5, 0, -1.0], [2.0, 0.03, 1.8], 0x35605d, { mat: "fabric", r: 0.01 });
  v.span([-4.0, 0.25, 0.6], [-1.9, 0.55, 2.9], C.woodDark, {});
  v.span([-4.0, 0.55, 0.6], [-1.9, 0.85, 2.9], 0xe6d9bf, { mat: "fabric", r: 0.06 });
  v.span([-3.95, 0.82, 1.8], [-1.9, 0.92, 2.88], 0x8b4a5a, { mat: "fabric", r: 0.05 });
  v.box([-3.5, 0.98, 0.95], [0.9, 0.2, 0.4], 0xf0e8d6, { mat: "fabric", r: 0.08 });
  // posters on the left wall
  [[-0.2, 0xb36a40, 1.4], [0.5, 0x4f7f7b, 1.0], [0.1, 0xc9a23a, 0.9]].forEach(([z, col, w], i) => v.box([-3.97, 2.4 - (i % 2) * 0.1, 1.2 + i * 1.0 + (z as number) * 0], [0.03, 1.3, w as number], col as number, { r: 0.01 }));
  // desk along the back wall, left
  v.span([-3.8, 0.8, -3.0], [-0.9, 0.88, -2.0], C.woodLight, { mat: "satin", r: 0.015 });
  for (const [x, z] of [[-3.75, -2.95], [-0.95, -2.95], [-3.75, -2.05], [-0.95, -2.05]]) v.span([x, 0, z], [x + 0.07, 0.8, z + 0.07], C.woodDark, {});
  // monitor, keyboard, speakers
  v.box([-2.3, 1.45, -2.72], [1.3, 0.78, 0.07], 0x15191b, { mat: "satin", r: 0.02 });
  v.box([-2.3, 0.98, -2.7], [0.14, 0.22, 0.1], 0x15191b, { mat: "metal" });
  v.box([-2.3, 0.9, -2.55], [0.5, 0.05, 0.28], 0x15191b, { mat: "metal" });
  v.box([-2.3, 0.93, -2.1], [0.7, 0.04, 0.24], 0x2b3236, { mat: "satin", r: 0.01 });
  for (const sx of [-3.35, -1.25]) v.box([sx, 1.1, -2.7], [0.26, 0.42, 0.26], 0x24393a, { mat: "satin", r: 0.03 });
  // chair
  v.box([-2.2, 0.55, -1.5], [0.6, 0.08, 0.6], 0x2f4d4c, { mat: "fabric", r: 0.03 });
  v.box([-2.2, 0.95, -1.8], [0.58, 0.7, 0.08], 0x2f4d4c, { mat: "fabric", r: 0.03 });
  v.rod([-2.2, 0, -1.5], [-2.2, 0.52, -1.5], 0.06, 0x1d2224, { mat: "metal" });
  // mic stand (in front of where he stands), boom and pop filter
  v.prism([0.9, 0.04, 0.55], 0.28, 0.08, 0x1d2224, { sides: 10, mat: "metal" });
  v.rod([0.9, 0.05, 0.55], [0.9, 1.62, 0.55], 0.04, 0x1d2224, { mat: "metal" });
  v.prismAlong([0.9, 1.7, 0.5], [0, 0.2, -1], 0.07, 0.3, 0x8b8880, { sides: 8, mat: "metal" });
  v.box([0.9, 1.7, 0.36], [0.34, 0.34, 0.012], 0x15191b, { mat: "satin", r: 0.004 });
  // plant, lamp, shelf with books
  v.box([3.6, 0.3, -2.4], [0.5, 0.6, 0.5], C.copperDark, { r: 0.05 });
  for (let i = 0; i < 7; i++) v.rod([3.6, 0.6, -2.4], [3.6 + Math.cos(i) * 0.5, 1.4 + (i % 3) * 0.25, -2.4 + Math.sin(i) * 0.4], 0.07, i % 2 ? C.leaf : C.leafLight, { mat: "foliage" });
  v.span([3.4, 1.9, -3.0], [4.2, 1.97, -2.55], C.woodLight, {});
  for (let i = 0; i < 6; i++) v.box([3.5 + i * 0.12, 2.1, -2.8], [0.09, 0.3 + (i % 3) * 0.04, 0.2], [0xb36a40, 0x4f7f7b, 0xc9a23a, 0x8b4a5a][i % 4], { r: 0.01 });
  v.rod([-3.55, 0.88, -2.7], [-3.55, 1.5, -2.7], 0.03, 0x1d2224, { mat: "metal" });
  v.box([-3.55, 1.62, -2.7], [0.34, 0.26, 0.34], 0xf1e6c8, { mat: "satin", r: 0.04 });
};

const STRINGS: Pane[] = Array.from({ length: 16 }, (_, i): Pane => {
  const t = i / 15;
  return { pos: [-3.8 + t * 8, 3.45 - Math.sin(t * Math.PI) * 0.45, -2.88], size: [0.12, 0.12], rotY: 0, tint: [0xffb469, 0xe8a7b8, 0x86aca6, 0xf0d28a][i % 4], glow: (f) => 2.2 * ramp(f, 20 + i * 5, 50 + i * 5) * (0.8 + 0.2 * Math.sin(f * 0.1 + i)) };
});
const SCREEN = (f: number) => 1.5 * ramp(f, 30, 70) * (0.85 + 0.15 * Math.sin(f * 0.3));
const PANES: Pane[] = [
  { pos: [-2.3, 1.45, -2.68], size: [1.2, 0.68], rotY: 0, tint: 0x7fb0ff, glow: SCREEN },
  { pos: [2.1, 1.95, -3.02], size: [2.2, 2.0], rotY: 0, tint: 0x5a7fc8, glow: () => 0.9 },
  { pos: [-3.55, 1.62, -2.52], size: [0.3, 0.22], rotY: 0, tint: 0xffcf86, glow: (f) => 2.5 * ramp(f, 10, 25) },
  ...STRINGS,
];
// equalizer bars on the screen, as small panes
const EQ: Pane[] = Array.from({ length: 10 }, (_, i): Pane => ({ pos: [-2.75 + i * 0.1, 1.38, -2.675], size: [0.07, 0.3], rotY: 0, tint: 0xffe2b0, glow: (f) => (0.8 + 1.8 * Math.abs(Math.sin(f * 0.13 + i * 1.3) * Math.sin(f * 0.07 + i))) * ramp(f, 80, 110) }));

const ROOM_SKY = { top: 0x16213a, mid: 0x23375c, low: 0x3a4a6a };
const SHELL: Shell = {
  sky: ROOM_SKY, env: 0.3, fog: { density: 0.0025, color: 0x23375c }, light: { from: [6, 10, 9], intensity: 0.9, color: 0xb9ccf2, fill: 0.55, size: 10 },
  shots: [{
    name: "studio", from: 0, to: sec(9.2),
    keys: [
      { f: 0, pos: [7.5, 3.2, 8.0], at: [-0.2, 1.4, -0.8], fov: 44 },
      { f: sec(4.0), pos: [4.2, 1.9, 5.0], at: [0.2, 1.5, -0.3], fov: 38 },
      { f: sec(9.2), pos: [2.2, 1.7, 3.6], at: [-0.1, 1.55, -0.5], fov: 32 },
    ],
    focus: () => [0.2, 1.6, -0.3],
    aperture: 0.0016, maxBlur: 0.009, exposure: 1.15, fog: 0.0025, handheld: 0.0035,
  }],
};

export const Studio: React.FC<{ f: number }> = ({ f }) => {
  const nod = Math.sin(f * 0.13);
  const sing = ramp(f, sec(1.2), sec(2));
  return (
    <SceneShell shell={SHELL} f={f}>
      {() => (
        <>
          <VoxModel build={room} seed={91} />
          <GlowPanes panes={PANES} f={f} />
          <GlowPanes panes={EQ} f={f} />
          <pointLight position={[-2.3, 1.5, -1.7]} color={0x7fb0ff} intensity={4 * ramp(f, 30, 70)} distance={5} decay={2} />
          <pointLight position={[-3.4, 1.7, -2.3]} color={0xffb469} intensity={4 * ramp(f, 10, 30)} distance={5} decay={2} />
          <pointLight position={[0.5, 3.2, 0.5]} color={0xffd9a8} intensity={1.6 * ramp(f, 20, 60)} distance={9} decay={2} />
          <Halo pos={[-3.55, 1.62, -2.4]} size={1.6} color={0xffb469} opacity={0.55 * ramp(f, 10, 30)} />
          <Character phones scale={0.88} pos={[0.35, 0, -0.5]} rotY={0.28} pose={{ t: f, lean: 0.04 + 0.04 * nod * sing, headPitch: 0.05 - 0.1 * nod * sing, headYaw: 0.1 * Math.sin(f * 0.05) * sing, armL: [-0.4 - 0.5 * sing, 1.2], armR: [-1.7 * sing - 0.1, 1.0 + 0.2 * Math.max(0, nod) * sing] }} />
        </>
      )}
    </SceneShell>
  );
};
void ease; void clamp; void hash;
