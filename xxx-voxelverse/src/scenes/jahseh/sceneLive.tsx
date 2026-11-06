// Scenes 4 and 5: the online breakthrough (night plaza, glowing phones, pulsing rings) and the big stage
// (truss, beams, equaliser wall, chart pillars rising to a golden #1).
import React, { useMemo } from "react";
import { CylinderGeometry } from "three";
import { clamp, ease, lerp, ramp } from "../../kits/voxelverse/core/motion";
import { hash } from "../../kits/voxelverse/core/noise";
import { C } from "../../kits/voxelverse/lib/palette";
import { FX_LAYER } from "../../kits/voxelverse/lib/layers";
import { makeConeMaterial } from "../../kits/voxelverse/lib/materials";
import { GlowPanes, VoxModel, type Pane } from "../../kits/voxelverse/lib/components";
import type { Vox } from "../../kits/voxelverse/lib/voxel";
import { Plinth } from "../../kits/voxelverse/world/Plinth";
import { Buildings, type BuildingSpec, type GlowFn, type Placement } from "../../kits/voxelverse/world/Building";
import { Character } from "./character";
import { Halo, SceneShell, Stars, bob, crowdBuild, people, sec, type Shell } from "./common";
import { PLINTH } from "./street";

const north = (cx: number): Placement => ({ pos: [cx, 0, -PLINTH.walkOuter], rotY: 0 });
const TOWN: { spec: BuildingSpec; at: Placement }[] = [
  { at: north(-8), spec: { w: 7, depth: 7.5, ground: 4.0, floors: [3.2, 3.2], wall: "brick", wallColor: C.brickDark, trim: C.stoneLight, win: "arched", bays: 4, winW: 1.1, winH: 2.0, roof: "saw", roofColor: C.copperPatina, shop: "depot", extras: ["chimney"], seed: 11 } },
  { at: north(-1.5), spec: { w: 6, depth: 7, ground: 3.4, floors: [3.0, 3.0, 3.0], wall: "plaster", wallColor: C.cream, trim: C.teal, win: "tall", bays: 2, winW: 0.9, winH: 1.9, roof: "mansard", roofColor: C.tealDeep, shop: "bakery", shopColor: C.copper, extras: ["balconies", "plants"], seed: 12 } },
  { at: north(5), spec: { w: 7, depth: 7.5, ground: 3.6, floors: [3.2, 3.2], wall: "stone", wallColor: C.stoneLight, trim: C.stoneDark, win: "band", bays: 3, winW: 1.0, winH: 1.6, roof: "stepped", roofColor: C.stone, shop: "arcade", shopColor: C.stoneDark, extras: ["ac"], seed: 13 } },
  { at: north(10.6), spec: { w: 4, depth: 7, ground: 3.4, floors: [3.0, 3.0, 3.0], wall: "brick", wallColor: C.brick, trim: C.cream, win: "tall", bays: 2, winW: 0.95, winH: 1.8, roof: "flat", roofColor: C.stoneDark, shop: "none", extras: ["fireEscape", "plants"], seed: 14 } },
];
const NIGHT = { top: 0x0b1530, mid: 0x1d3159, low: 0x5b4a62 };
const nightGlow: GlowFn = ({ seed, shop }) => () => (shop ? 1 : hash(seed * 3 + 1) < 0.7 ? 0.8 : 0.1);

const LAMPS: [number, number][] = [[-6, -3.05], [-1.5, 3.05], [4.5, -3.05], [9.5, 3.05]];
const lampPosts = (v: Vox) => {
  for (const [x, z] of LAMPS) {
    const out = z < 0 ? 1 : -1;
    v.span([x - 0.05, 0.15, z - 0.05], [x + 0.05, 4.2, z + 0.05], C.ink, { mat: "metal", r: 0.015 });
    v.span([x - 0.04, 4.1, z], [x + 0.04, 4.18, z + out * 0.8], C.ink, { mat: "metal", r: 0.01 });
    v.span([x - 0.16, 3.98, z + out * 0.62], [x + 0.16, 4.1, z + out * 0.98], C.ink, { mat: "metal", r: 0.02 });
  }
};
const lampPanes: Pane[] = LAMPS.map(([x, z]): Pane => ({ pos: [x, 3.975, z + (z < 0 ? 0.8 : -0.8)], size: [0.28, 0.3], rotY: 0, tint: 0xffcf86, glow: () => 3 }));

const STAGE_Z = -1.4;
const stagePlatform = (v: Vox) => {
  v.span([-3.2, 0, STAGE_Z - 1.0], [3.2, 0.7, STAGE_Z + 1.0], C.stoneDark, { r: 0.03 });
  v.span([-3.3, 0.68, STAGE_Z - 1.1], [3.3, 0.76, STAGE_Z + 1.1], 0x24393a, { mat: "satin", r: 0.02 });
  for (const sx of [-3.9, 3.9]) {
    v.box([sx, 0.75, STAGE_Z - 0.6], [0.8, 1.5, 0.7], 0x1d2224, { mat: "satin", r: 0.04 });
    v.prism([sx, 0.5, STAGE_Z - 0.24], 0.22, 0.06, 0x3a3d45, { sides: 12, mat: "metal" });
    v.prism([sx, 1.1, STAGE_Z - 0.24], 0.22, 0.06, 0x3a3d45, { sides: 12, mat: "metal" });
  }
};

/* ---------- 4. breakthrough ---------- */
const VIRAL_CROWD = people(5, 46, -6.5, 6.5, 0.5, 5.2);
const BANDS = [0, 1, 2, 3].map((b) => VIRAL_CROWD.filter((_, i) => i % 4 === b));
const PHONES: Pane[] = VIRAL_CROWD.filter((p) => p.phone).map((p, i): Pane => ({ pos: [p.x + 0.05, 1.72 * p.h, p.z + 0.2], size: [0.12, 0.2], rotY: 0, tint: i % 3 ? 0xdfeaff : 0xffe2b0, glow: (f) => ramp(f, 30 + (i % 9) * 8, 60 + (i % 9) * 8) * (1.1 + 0.4 * Math.sin(f * 0.2 + i)) }));

const VIRAL: Shell = {
  sky: NIGHT, env: 0.4, fog: { density: 0.006, color: 0x1d3159 }, light: { from: [-10, 22, 16], color: 0x9db4ff, intensity: 0.8, fill: 0.4, size: 20 },
  shots: [{
    name: "viral", from: 0, to: sec(9.2),
    keys: [
      { f: 0, pos: [-9.5, 2.0, 11], at: [-1.5, 1.4, -1.0], fov: 46 },
      { f: sec(4.5), pos: [-3.5, 2.8, 9.0], at: [0, 1.7, -1.4], fov: 42 },
      { f: sec(9.2), pos: [0.9, 2.9, 7.4], at: [0, 1.9, -1.4], fov: 36 },
    ],
    focus: () => [0, 1.6, -1.4],
    aperture: 0.0016, maxBlur: 0.009, exposure: 1.1, fog: 0.006, handheld: 0.004,
  }],
};

export const Viral: React.FC<{ f: number }> = ({ f }) => {
  const glow = useMemo(() => nightGlow, []);
  const hype = ramp(f, sec(1), sec(3));
  const jump = Math.abs(Math.sin(f * 0.17)) * 0.22 * hype;
  return (
    <SceneShell shell={VIRAL} f={f}>
      {() => (
        <>
          <Stars />
          <Plinth spec={{ ...PLINTH, crossingX: 8.5 }} />
          <Buildings list={TOWN} glow={glow} f={f} />
          <VoxModel build={lampPosts} seed={31} />
          <GlowPanes panes={lampPanes} f={f} />
          <VoxModel build={stagePlatform} seed={33} />
          {BANDS.map((b, i) => (
            <group key={i} position={[0, bob(f, i, 0.09 * hype), 0]}>
              <VoxModel build={crowdBuild(b, 0.05)} seed={40 + i} />
            </group>
          ))}
          <GlowPanes panes={PHONES} f={f} />
          {[0, 1, 2].map((i) => {
            const k = ((f / sec(1.6) + i / 3) % 1);
            return <Halo key={i} flat pos={[0, 0.8, STAGE_Z + 1.2]} size={2 + k * 14} color={0x9db4ff} opacity={0.55 * (1 - k) * hype} />;
          })}
          <pointLight position={[0, 3, STAGE_Z + 1]} color={0xffd9a8} intensity={10 * hype} distance={9} decay={2} />
          <Character pos={[0, 0.76 + jump, STAGE_Z]} rotY={0} pose={{ t: f, lean: 0.05, armL: [-2.7 * hype + 0.1, 0.3], armR: [-0.5 + Math.sin(f * 0.2) * 0.4 * hype, 1.2], headPitch: 0.1 * Math.sin(f * 0.17) }} />
        </>
      )}
    </SceneShell>
  );
};

/* ---------- 5. stage + chart ---------- */
const STAGE_CROWD = people(9, 70, -7, 7, 0.4, 6.0);
const SBANDS = [0, 1, 2, 3].map((b) => STAGE_CROWD.filter((_, i) => i % 4 === b));
const truss = (v: Vox) => {
  v.span([-4.4, 4.5, STAGE_Z - 1.0], [4.4, 4.66, STAGE_Z - 0.84], 0x8b8880, { mat: "metal", r: 0.02 });
  v.span([-4.4, 4.0, STAGE_Z - 1.0], [4.4, 4.1, STAGE_Z - 0.9], 0x8b8880, { mat: "metal", r: 0.02 });
  for (const sx of [-4.4, 4.4]) v.span([sx - 0.08, 0, STAGE_Z - 1.0], [sx + 0.08, 4.66, STAGE_Z - 0.84], 0x8b8880, { mat: "metal", r: 0.02 });
  for (let x = -4.2; x < 4.3; x += 0.6) v.rod([x, 4.05, STAGE_Z - 0.95], [x + 0.3, 4.58, STAGE_Z - 0.95], 0.05, 0x8b8880, { mat: "metal" });
  // back wall behind the equaliser
  v.span([-4.2, 0.76, STAGE_Z - 1.15], [4.2, 4.0, STAGE_Z - 1.0], 0x15191b, { mat: "satin", r: 0.02 });
};
const EQW: Pane[] = [];
for (let c = 0; c < 20; c++) for (let r = 0; r < 8; r++) {
  EQW.push({ pos: [-3.8 + c * 0.4, 1.1 + r * 0.34, STAGE_Z - 0.98], size: [0.32, 0.27], rotY: 0, tint: r > 5 ? 0xff8a5c : r > 3 ? 0xffd27a : 0x7fd0ff, glow: (f) => {
    const lvl = 0.5 + 0.5 * Math.sin(f * 0.11 + c * 0.9) * Math.sin(f * 0.047 + c * 0.3);
    return r < lvl * 8 ? 1.7 * ramp(f, 0, 30) : 0.05;
  } });
}
const beamMat = (c: number) => makeConeMaterial(c);

const CHART_X = -8.6, CHART_Z = -1.2;
const pillar = (v: Vox) => v.box([0, 0.5, 0], [0.9, 1, 0.9], 0xe6d9bf, { mat: "satin", r: 0.05 });
const star = (v: Vox) => {
  for (let i = 0; i < 5; i++) v.rod([0, 0, 0], [Math.cos(i * 1.2566 + 1.5708) * 0.5, Math.sin(i * 1.2566 + 1.5708) * 0.5, 0], 0.16, 0xffd27a, { mat: "metal" });
  v.box([0, 0, 0], [0.32, 0.32, 0.18], 0xffd27a, { mat: "metal", r: 0.05 });
};
const podium = (v: Vox) => v.span([CHART_X - 2.4, 0.16, CHART_Z - 0.8], [CHART_X + 2.4, 0.3, CHART_Z + 0.8], C.stoneDark, { r: 0.03 });

const STAGE: Shell = {
  sky: NIGHT, env: 0.4, fog: { density: 0.007, color: 0x1d3159 }, light: { from: [-10, 22, 16], color: 0x9db4ff, intensity: 0.6, fill: 0.35, size: 20 },
  shots: [{
    name: "stage", from: 0, to: sec(9.2),
    keys: [
      { f: 0, pos: [0, 1.7, 9.5], at: [0, 2.0, -1.4], fov: 52 },
      { f: sec(3.6), pos: [2.0, 3.6, 8.5], at: [0, 2.2, -1.4], fov: 46 },
      { f: sec(5.0), pos: [-2.5, 2.8, 9.5], at: [-6.0, 1.9, -1.0], fov: 44 },
      { f: sec(9.2), pos: [-4.8, 3.6, 10.2], at: [CHART_X + 0.4, 3.0, CHART_Z], fov: 46 },
    ],
    focus: (f) => (f < sec(4.3) ? [0, 1.8, -1.4] : [CHART_X, 2.0, CHART_Z]),
    aperture: 0.0016, maxBlur: 0.009, exposure: 1.15, fog: 0.007, handheld: 0.004,
  }],
};
const BEAM_COL = [0xff9a5c, 0x7fd0ff, 0xffd27a, 0xe8a7b8, 0x9d8cff];

export const Stage: React.FC<{ f: number }> = ({ f }) => {
  const glow = useMemo(() => nightGlow, []);
  const cone = useMemo(() => new CylinderGeometry(0.02, 1.15, 8.6, 20, 1, true), []);
  const mats = useMemo(() => BEAM_COL.map(beamMat), []);
  const on = ramp(f, 0, 25);
  const rise = (i: number) => ease.body(clamp((f - sec(4.2 + i * 0.7)) / sec(1.4)));
  const heights = [1.4, 2.3, 3.6];
  const barX = [CHART_X - 1.5, CHART_X, CHART_X + 1.5];
  return (
    <SceneShell shell={STAGE} f={f}>
      {() => (
        <>
          <Stars />
          <Plinth spec={PLINTH} />
          <Buildings list={TOWN} glow={glow} f={f} />
          <VoxModel build={stagePlatform} seed={33} />
          <VoxModel build={truss} seed={34} />
          <GlowPanes panes={EQW} f={f} />
          {SBANDS.map((b, i) => (
            <group key={i} position={[0, bob(f, i, 0.12, 0.15), 0]}>
              <VoxModel build={crowdBuild(b, 0.05, true)} seed={60 + i} />
            </group>
          ))}
          {BEAM_COL.map((c, i) => {
            const x = -3.6 + i * 1.8;
            const sway = Math.sin(f * 0.025 + i * 1.7) * 0.5;
            const tilt = Math.cos(f * 0.021 + i * 1.1) * 0.35;
            return (
              <group key={i} position={[x, 4.0, STAGE_Z - 0.2]} rotation={[0.35 + tilt * 0.3, 0, sway]}>
                <mesh geometry={cone} material={mats[i]} position={[0, -4.3, 0]} ref={(m) => { if (m) { m.layers.set(FX_LAYER); (m.material as unknown as { uniforms: { uIntensity: { value: number } } }).uniforms.uIntensity.value = 0.55 * on; } }} />
                <mesh position={[0, 0, 0]}><boxGeometry args={[0.28, 0.2, 0.28]} /><meshStandardMaterial color={0x15191b} /></mesh>
              </group>
            );
          })}
          <pointLight position={[0, 3.2, STAGE_Z + 1.6]} color={0xffd9a8} intensity={12 * on} distance={10} decay={2} />
          <pointLight position={[-2.5, 3, STAGE_Z + 1.2]} color={0xff9a5c} intensity={6 * on} distance={8} decay={2} />
          <pointLight position={[2.5, 3, STAGE_Z + 1.2]} color={0x7fd0ff} intensity={6 * on} distance={8} decay={2} />
          <Character pos={[0, 0.76 + Math.abs(Math.sin(f * 0.14)) * 0.18, STAGE_Z]} rotY={0} pose={{ t: f, lean: 0.06, armL: [-2.8, 0.1], armR: [-2.5 + Math.sin(f * 0.14) * 0.3, 0.2], headPitch: 0.15 }} />
          <VoxModel build={podium} seed={36} />
          {barX.map((x, i) => (
            <group key={i} position={[x, 0.3, CHART_Z]} scale={[1, Math.max(0.001, heights[i] * rise(i)), 1]}>
              <VoxModel build={pillar} seed={37 + i} />
            </group>
          ))}
          <group position={[barX[2], 0.3 + heights[2] * rise(2) + 0.7, CHART_Z]} rotation={[0, f * 0.03, 0]} scale={rise(2)}>
            <VoxModel build={star} seed={39} />
          </group>
          <Halo pos={[barX[2], 0.3 + heights[2] * rise(2) + 0.7, CHART_Z + 0.4]} size={3.2} color={0xffd27a} opacity={0.7 * rise(2)} />
          <pointLight position={[barX[2], 0.3 + heights[2] + 1.1, CHART_Z + 1]} color={0xffd27a} intensity={9 * rise(2)} distance={6} decay={2} />
        </>
      )}
    </SceneShell>
  );
};
void lerp;
