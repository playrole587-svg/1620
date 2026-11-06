// Scenes 1, 2 and 7: the Florida street — birth (golden hour), childhood (grey, rain) and memorial (night).
import React from "react";
import { ease, lerp, clamp, ramp } from "../../kits/voxelverse/core/motion";
import { hash } from "../../kits/voxelverse/core/noise";
import { C } from "../../kits/voxelverse/lib/palette";
import { GlowPanes, VoxModel, type Pane } from "../../kits/voxelverse/lib/components";
import type { Vox } from "../../kits/voxelverse/lib/voxel";
import type { GlowFn } from "../../kits/voxelverse/world/Building";
import { Rain } from "../../kits/voxelverse/world/Rain";
import { Character } from "./character";
import { GOLDEN } from "./props";
import { PLINTH, Street } from "./street";
import { Halo, SceneShell, Stars, candle, flowers, sec, type Shell } from "./common";

/* ---------- 1. birth ---------- */
const BIRTH: Shell = {
  sky: GOLDEN, env: 0.55, fog: { density: 0.004, color: 0xe8c49a }, light: {},
  shots: [{
    name: "birth", from: 0, to: sec(8.6),
    keys: [
      { f: 0, pos: [15, 7.5, 15], at: [-0.5, 2.0, -4], fov: 44 },
      { f: sec(3.2), pos: [6.2, 2.4, 4.6], at: [-1.0, 1.9, -4.2], fov: 40 },
      { f: sec(8.6), pos: [1.2, 1.15, 0.9], at: [-1.0, 0.95, -3.7], fov: 32 },
    ],
    focus: (f) => (f < sec(3) ? [-1, 1.5, -4] : [-1.1, 0.8, -3.5]),
    aperture: 0.0012, maxBlur: 0.008, exposure: 1.0, fog: 0.004, handheld: 0.003,
  }],
};

const balloons = (v: Vox) => {
  const cols = [0xe8a7b8, 0x86aca6, 0xf0d28a, 0xb89ad9, 0xe8742a];
  cols.forEach((c, i) => {
    const x = -2.7 + i * 0.3, y = 3.0 + (i % 3) * 0.45;
    v.rod([-2.2, 1.0, -3.9], [x, y - 0.35, -3.9 + (i % 2) * 0.2], 0.012, 0xe6d9bf);
    v.box([x, y, -3.9 + (i % 2) * 0.2], [0.42, 0.5, 0.42], c, { mat: "gloss", r: 0.14 });
  });
  v.box([-2.2, 0.55, -3.9], [0.3, 0.3, 0.3], C.woodDark, { r: 0.03 });
};

export const Birth: React.FC<{ f: number }> = ({ f }) => {
  const glow: GlowFn = () => () => 0.7;
  const wave = Math.sin(f * 0.16) * 0.3;
  const ent = ease.body(clamp((f - sec(1.4)) / sec(1.4)));
  return (
    <SceneShell shell={BIRTH} f={f}>
      {() => (
        <>
          <Street f={f} glow={glow} />
          <VoxModel build={balloons} seed={71} />
          <Character scale={0.4} pos={[lerp(-3.4, -1.4, ent), 0.15, -3.4]} rotY={lerp(1.2, 0.05, ent)} pose={{ t: f, walk: f * 0.3, amp: ent < 1 ? 0.8 : 0, armR: ent < 1 ? undefined : [-2.6 + wave, 0.3], headYaw: 0 }} />
        </>
      )}
    </SceneShell>
  );
};

/* ---------- 2. childhood ---------- */
const GREY = { top: 0x56667a, mid: 0x8e9aa4, low: 0xb4a89a };
const CHILD: Shell = {
  sky: GREY, env: 0.45, fog: { density: 0.011, color: 0x8e9aa4 }, light: { color: 0xc4d0dc, intensity: 1.1, from: [-14, 22, 20], fill: 0.55 },
  shots: [{
    name: "child", from: 0, to: sec(8.6),
    keys: [
      { f: 0, pos: [7.5, 1.0, 5.2], at: [-1, 0.95, -4.4], fov: 38 },
      { f: sec(4.5), pos: [4.2, 0.95, 2.2], at: [-1, 0.9, -4.5], fov: 34 },
      { f: sec(8.6), pos: [2.2, 0.9, -0.6], at: [-1, 0.95, -4.6], fov: 30 },
    ],
    focus: () => [-1, 0.8, -4.65],
    aperture: 0.0016, maxBlur: 0.009, exposure: 0.95, fog: 0.011, handheld: 0.004,
  }],
};
const childPanes: Pane[] = [{ pos: [-2.9, 2.4, -4.9], size: [1.0, 1.9], rotY: 0, tint: 0xffcf86, glow: () => 0 }];

export const Childhood: React.FC<{ f: number }> = ({ f }) => {
  const glow: GlowFn = ({ seed }) => (ff) => 0.35 + 0.4 * hash(seed) * ramp(ff, 20, 120);
  const rain = clamp(ramp(f, 0, sec(1.5)));
  const nod = Math.sin(f / 40) * 0.03;
  return (
    <SceneShell shell={CHILD} f={f}>
      {(cam) => (
        <>
          <Street f={f} glow={glow} />
          <GlowPanes panes={childPanes} f={f} />
          <Character scale={0.4} pos={[-1.0, 0.45, -4.62]} rotY={0.1} pose={{ t: f, sit: 1, lean: 0.25 + nod, headPitch: -0.35 - nod, armL: [-0.7, 1.1], armR: [-0.7, 1.1] }} />
          <Rain cam={cam} f={f} amount={rain * 0.8} wide={rain * 0.5} bounds={{ minX: PLINTH.minX, maxX: PLINTH.maxX, minZ: PLINTH.minZ, maxZ: PLINTH.maxZ, height: 14 }} groundY={(_x, z) => (Math.abs(z) > PLINTH.roadHalf ? PLINTH.curb : 0.035)} />
        </>
      )}
    </SceneShell>
  );
};

/* ---------- 7. memorial ---------- */
const NIGHT = { top: 0x0a1630, mid: 0x1c2f55, low: 0x7a5566 };
const MEMORIAL: Shell = {
  sky: NIGHT, env: 0.35, fog: { density: 0.006, color: 0x1c2f55 }, light: { color: 0x9db4ff, intensity: 0.7, from: [-10, 20, 14], fill: 0.35 },
  shots: [{
    name: "memorial", from: 0, to: sec(8.2),
    keys: [
      { f: 0, pos: [-0.2, 0.75, -2.2], at: [-1, 0.6, -4.3], fov: 34 },
      { f: sec(3.0), pos: [-1.4, 1.9, 1.5], at: [-1.6, 0.9, -4.2], fov: 38 },
      { f: sec(8.2), pos: [-1, 22, 36], at: [-2, 0, -2], fov: 40 },
    ],
    focus: (f) => (f < sec(3.5) ? [-1, 0.5, -4.2] : [-2, 0.5, -3]),
    aperture: (f) => (f < sec(3.5) ? 0.002 : 0.0004), maxBlur: 0.009, exposure: 1.05, fog: 0.006, handheld: 0.003,
  }],
};
const shrine = (v: Vox) => {
  const pts: [number, number][] = [[-1.7, -4.25], [-1.35, -4.0], [-0.95, -4.3], [-0.6, -4.05], [-0.3, -4.3], [-2.0, -4.0], [-1.1, -3.7]];
  pts.forEach(([x, z], i) => candle(v, [x, i < 5 ? 0.45 : 0.225, z], 0.2 + (i % 3) * 0.06));
  flowers(v, [-1.5, 0.45, -4.55], 12, 0.5);
  flowers(v, [-0.6, 0.45, -4.5], 9, 0.4);
  v.box([-2.3, 0.45 + 0.02, -4.5], [0.4, 0.04, 0.4], 0xe6d9bf);
};
const FLAMES: [number, number, number][] = [[-1.7, 0.45 + 0.23, -4.25], [-1.35, 0.45 + 0.29, -4.0], [-0.95, 0.45 + 0.26, -4.3], [-0.6, 0.45 + 0.32, -4.05], [-0.3, 0.45 + 0.29, -4.3], [-2.0, 0.225 + 0.26, -4.0], [-1.1, 0.225 + 0.32, -3.7]];
const flamePanes: Pane[] = FLAMES.map((p, i): Pane => ({ pos: [p[0], p[1], p[2]], size: [0.07, 0.11], rotY: 0, tint: 0xffb469, glow: (f) => ramp(f, 10 + i * 6, 40 + i * 6) * (3.2 + Math.sin(f * 0.21 + i * 2.1) * 0.5 + Math.sin(f * 0.53 + i) * 0.3) }));

export const Memorial: React.FC<{ f: number }> = ({ f }) => {
  const glow: GlowFn = ({ seed, floor }) => () => (hash(seed * 3 + floor) < 0.55 ? 0.7 : 0.05);
  const walkT = clamp((f - sec(2.0)) / sec(5.8));
  const x = lerp(-3.3, -13, ease.body(walkT));
  const fade = 1 - ramp(f, sec(6.8), sec(7.9));
  return (
    <SceneShell shell={MEMORIAL} f={f}>
      {() => (
        <>
          <Stars />
          <Street f={f} glow={glow} />
          <VoxModel build={shrine} seed={81} />
          <GlowPanes panes={flamePanes} f={f} />
          <pointLight position={[-1.2, 0.95, -3.7]} color={0xffb469} intensity={3.2 * ramp(f, 10, 50)} distance={5} decay={2} />
          {FLAMES.map((p, i) => <Halo key={i} pos={[p[0], p[1], p[2] + 0.05]} size={0.5} color={0xffb469} opacity={0.5 * ramp(f, 10 + i * 6, 50 + i * 6)} />)}
          <Character scale={0.88} pos={[x, 0.15, -3.0]} rotY={-Math.PI / 2} pose={{ t: f, walk: f * 0.17, amp: walkT > 0 && walkT < 1 ? 1 : 0 }} />
          <Halo pos={[x - 0.5, 1.0, -3.0]} size={4} color={0xffe2b0} opacity={0.35 * fade * ramp(f, sec(1.8), sec(3)) * (1 - ramp(f, sec(7), sec(8)))} />
        </>
      )}
    </SceneShell>
  );
};
