// Scene 6: the shadow over his career — a grey courthouse in the rain, a small figure at the foot of the steps.
import React from "react";
import { clamp, ease, lerp, ramp } from "../../kits/voxelverse/core/motion";
import { C } from "../../kits/voxelverse/lib/palette";
import { VoxModel } from "../../kits/voxelverse/lib/components";
import type { Vox } from "../../kits/voxelverse/lib/voxel";
import { Plinth } from "../../kits/voxelverse/world/Plinth";
import { Rain } from "../../kits/voxelverse/world/Rain";
import { Character } from "./character";
import { SceneShell, sec, type Shell } from "./common";
import { PLINTH } from "./street";

const STONE = 0x9a9892, STONE_L = 0xbdb9b0;
const court = (v: Vox) => {
  const z0 = -5.2;
  // wide steps
  for (let i = 0; i < 6; i++) v.span([-6.5 + i * 0.1, 0.15 + i * 0.22, z0 + 3.2 - i * 0.5 - 0.5], [6.5 - i * 0.1, 0.15 + (i + 1) * 0.22, z0 + 3.2 - i * 0.5 + 0.0], STONE_L, { mat: "wet", r: 0.02 });
  const base = 0.15 + 6 * 0.22;
  // body
  v.span([-6.2, base, z0 - 5.5], [6.2, base + 7.0, z0], STONE, { jitter: 0.02 });
  v.span([-6.4, base + 6.4, z0 - 0.1], [6.4, base + 7.1, z0 + 1.6], STONE_L, { r: 0.03 });
  // columns
  for (let i = 0; i < 6; i++) {
    const x = -5.0 + i * 2.0;
    v.prism([x, base + 3.2, z0 + 0.8], 0.42, 6.4, STONE_L, { sides: 10, mat: "satin" });
    v.box([x, base + 0.1, z0 + 0.8], [1.1, 0.2, 1.1], STONE, { r: 0.03 });
    v.box([x, base + 6.5, z0 + 0.8], [1.1, 0.25, 1.1], STONE, { r: 0.03 });
  }
  // pediment: stepped triangle
  for (let i = 0; i < 6; i++) v.span([-6.4 + i * 1.0, base + 7.1 + i * 0.4, z0 - 0.1], [6.4 - i * 1.0, base + 7.5 + i * 0.4, z0 + 1.6], i % 2 ? STONE : STONE_L, { r: 0.03 });
  // doors
  v.span([-1.3, base, z0 - 0.02], [1.3, base + 3.6, z0 + 0.1], C.woodDark, { mat: "satin", r: 0.03 });
  v.span([0.0, base, z0 + 0.1], [0.04, base + 3.6, z0 + 0.12], C.copper, { mat: "metal" });
  // tall dark windows between columns
  for (const x of [-4.0, -2.0, 2.0, 4.0]) v.span([x - 0.4, base + 1.0, z0 - 0.02], [x + 0.4, base + 4.4, z0 + 0.05], 0x1b2426, { mat: "gloss", r: 0.02 });
  // flag pole
  v.span([6.8, 0.15, z0 + 2.4], [6.9, 9.0, z0 + 2.5], 0x8b8880, { mat: "metal" });
  v.span([5.4, 8.2, z0 + 2.43], [6.8, 8.9, z0 + 2.47], 0x6a7a96, { mat: "fabric", r: 0.01 });
};

const COLD = { top: 0x48566a, mid: 0x7d8993, low: 0xa3a09a };
const SHELL: Shell = {
  sky: COLD, env: 0.4, fog: { density: 0.013, color: 0x7d8993 }, light: { color: 0xbfcad6, intensity: 0.95, from: [-16, 24, 22], fill: 0.5, size: 22 },
  shots: [{
    name: "court", from: 0, to: sec(8.2),
    keys: [
      { f: 0, pos: [3.5, 0.9, 9.5], at: [0, 1.2, -1.5], fov: 44 },
      { f: sec(4.0), pos: [1.8, 0.9, 6.4], at: [0, 2.6, -2.5], fov: 44 },
      { f: sec(8.2), pos: [0.8, 0.95, 4.6], at: [0.0, 1.5, -3.0], fov: 40 },
    ],
    focus: () => [0, 1.0, 0.8],
    aperture: 0.0014, maxBlur: 0.009, exposure: 0.95, fog: 0.013, handheld: 0.004,
  }],
};

export const Court: React.FC<{ f: number }> = ({ f }) => {
  const rain = ramp(f, 0, sec(1));
  const w = clamp((f - sec(0.3)) / sec(2.6));
  const x = lerp(5, 0.2, ease.body(w));
  const walking = w > 0 && w < 1;
  return (
    <SceneShell shell={SHELL} f={f}>
      {(cam) => (
        <>
          <Plinth spec={{ ...PLINTH, minZ: -12, maxZ: 11 }} />
          <VoxModel build={court} seed={101} />
          <Character pos={[x, 0.15, 0.4]} rotY={lerp(-1.4, 0.15, ease.body(clamp((f - sec(2.4)) / sec(0.8))))} pose={{ t: f, walk: f * 0.15, amp: walking ? 0.8 : 0, headPitch: walking ? -0.1 : -0.3, lean: walking ? 0.08 : 0.12, armL: walking ? undefined : [0.05, 0.1], armR: walking ? undefined : [0.05, 0.1] }} />
          <Rain cam={cam} f={f} amount={rain} wide={rain * 0.5} bounds={{ minX: -12, maxX: 12, minZ: -12, maxZ: 11, height: 14 }} groundY={(_x, z) => (Math.abs(z) > PLINTH.roadHalf ? PLINTH.curb : 0.035)} />
        </>
      )}
    </SceneShell>
  );
};
