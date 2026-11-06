// Original voxel character: chunky proportions, tall tipped dreadlocks, oversized hoodie. Own design —
// a stylised voxel figure, not a likeness. Rig: groups per body part posed from the frame.
import React from "react";
import { VoxModel } from "../../kits/voxelverse/lib/components";
import type { Vox } from "../../kits/voxelverse/lib/voxel";

export const SKIN = 0x93603f;
export const SKIN_SHADE = 0x764a30;
export const HOOD = 0x4f7f7b;       // muted teal hoodie
export const HOOD_DARK = 0x35605d;
export const PANTS = 0x3a3d45;
export const SHOE = 0xe6d9bf;
export const DREAD = 0x2a1d17;
export const TIP = 0xd9a441;        // dyed tips

const head = (v: Vox) => {
  v.box([0, 0.27, 0], [0.5, 0.54, 0.48], SKIN, { r: 0.07 });
  v.box([-0.255, 0.27, 0], [0.02, 0.2, 0.2], SKIN_SHADE, { r: 0.008 }); // ears
  v.box([0.255, 0.27, 0], [0.02, 0.2, 0.2], SKIN_SHADE, { r: 0.008 });
  // face on +Z
  v.box([-0.1, 0.3, 0.245], [0.07, 0.07, 0.02], 0x14100e, { r: 0.01, mat: "gloss" });
  v.box([0.1, 0.3, 0.245], [0.07, 0.07, 0.02], 0x14100e, { r: 0.01, mat: "gloss" });
  v.box([-0.1, 0.375, 0.245], [0.12, 0.028, 0.02], DREAD, { r: 0.005 });
  v.box([0.1, 0.375, 0.245], [0.12, 0.028, 0.02], DREAD, { r: 0.005 });
  v.box([0, 0.22, 0.26], [0.07, 0.1, 0.05], SKIN_SHADE, { r: 0.015 });
  v.box([0, 0.1, 0.245], [0.14, 0.03, 0.02], 0x4a2a22, { r: 0.008 });
  // hair: cap + tall dreadlocks fanning out and down
  v.box([0, 0.56, -0.02], [0.54, 0.14, 0.52], DREAD, { r: 0.05, mat: "fabric" });
  v.box([0, 0.5, 0.2], [0.5, 0.06, 0.1], DREAD, { r: 0.02, mat: "fabric" });
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rx = Math.cos(a) * 0.26, rz = Math.sin(a) * 0.25 - 0.03;
    if (rz > 0.12 && Math.abs(rx) < 0.2) continue; // keep the face clear
    const len = 0.5 + v.rand() * 0.28;
    const top: [number, number, number] = [rx * 0.8, 0.58, rz * 0.8];
    const bot: [number, number, number] = [rx * 1.28, 0.58 - len, rz * 1.25 - (rz < 0 ? 0.05 : 0)];
    v.rod(top, bot, 0.075, DREAD, { mat: "fabric", r: 0.02 });
    v.rod([bot[0] * 0.99, bot[1] + 0.07, bot[2] * 0.99], [bot[0], bot[1] - 0.03, bot[2]], 0.082, TIP, { mat: "fabric", r: 0.02 });
  }
  // a few upright locks on the crown for silhouette
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    v.rod([Math.cos(a) * 0.1, 0.62, Math.sin(a) * 0.1 - 0.03], [Math.cos(a) * 0.2, 0.8 + (i % 3) * 0.04, Math.sin(a) * 0.2 - 0.03], 0.07, DREAD, { mat: "fabric", r: 0.02 });
    v.box([Math.cos(a) * 0.2, 0.82 + (i % 3) * 0.04, Math.sin(a) * 0.2 - 0.03], [0.08, 0.07, 0.08], TIP, { mat: "fabric", r: 0.02 });
  }
};

const torso = (v: Vox) => {
  v.box([0, 0.31, 0], [0.64, 0.66, 0.36], HOOD, { mat: "fabric", r: 0.07 });
  v.box([0, 0.0, 0], [0.66, 0.12, 0.38], HOOD_DARK, { mat: "fabric", r: 0.05 });          // hem
  v.box([0, 0.66, -0.04], [0.5, 0.14, 0.34], HOOD_DARK, { mat: "fabric", r: 0.06 });      // hood bunched at the neck
  v.box([0, 0.16, 0.19], [0.36, 0.2, 0.04], HOOD_DARK, { mat: "fabric", r: 0.02 });       // pocket
  v.box([-0.05, 0.5, 0.185], [0.025, 0.18, 0.02], 0xe6d9bf, { r: 0.005 });                // drawstrings
  v.box([0.05, 0.5, 0.185], [0.025, 0.16, 0.02], 0xe6d9bf, { r: 0.005 });
};

const upperArm = (v: Vox) => v.box([0, -0.2, 0], [0.22, 0.44, 0.22], HOOD, { mat: "fabric", r: 0.05 });
const foreArm = (v: Vox) => {
  v.box([0, -0.18, 0], [0.2, 0.36, 0.2], HOOD, { mat: "fabric", r: 0.05 });
  v.box([0, -0.4, 0.01], [0.16, 0.14, 0.16], SKIN, { r: 0.03 });
};
const thigh = (v: Vox) => v.box([0, -0.22, 0], [0.26, 0.5, 0.26], PANTS, { mat: "fabric", r: 0.05 });
const shin = (v: Vox) => {
  v.box([0, -0.2, 0], [0.24, 0.42, 0.24], PANTS, { mat: "fabric", r: 0.05 });
  v.box([0, -0.5, 0.06], [0.26, 0.15, 0.4], SHOE, { mat: "satin", r: 0.04 });
  v.box([0, -0.56, 0.06], [0.27, 0.03, 0.41], 0x8b8880, { r: 0.01 });
};

export type Pose = {
  /** walk cycle phase in radians; amplitude 0..1 */
  walk?: number;
  amp?: number;
  /** extra rotations (radians) */
  headYaw?: number; headPitch?: number;
  armL?: [number, number]; armR?: [number, number]; // [shoulder pitch, elbow bend]
  lean?: number;
  /** breathing / bob clock in frames */
  t: number;
};

/** Total height ≈ 1.95 at scale 1; use `scale` ~0.88 for a ≈1.7 m figure. */
export const Character: React.FC<{ pos: [number, number, number]; rotY: number; pose: Pose; scale?: number }> = ({ pos, rotY, pose, scale = 0.88 }) => {
  const { walk = 0, amp = 0, headYaw = 0, headPitch = 0, lean = 0, t } = pose;
  const sw = Math.sin(walk) * amp;
  const bob = Math.abs(Math.cos(walk)) * 0.04 * amp + Math.sin(t / 22) * 0.006;
  const armL = pose.armL ?? [sw * 0.7, 0.15 + amp * 0.25];
  const armR = pose.armR ?? [-sw * 0.7, 0.15 + amp * 0.25];
  const legL = sw * 0.7, legR = -sw * 0.7;
  const kneeL = Math.max(0, -Math.cos(walk) * amp) * 0.8, kneeR = Math.max(0, Math.cos(walk) * amp) * 0.8;
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={scale}>
      <group position={[0, 1.04 + bob, 0]} rotation={[lean, 0, 0]}>
        <VoxModel build={torso} seed={3} />
        <group position={[0, 0.72, 0]} rotation={[-headPitch, headYaw, 0]}>
          <VoxModel build={head} seed={5} />
        </group>
        {([[-1, armL], [1, armR]] as const).map(([s, a]) => (
          <group key={s} position={[s * 0.4, 0.58, 0]} rotation={[a[0], 0, s * 0.06]}>
            <VoxModel build={upperArm} seed={7} />
            <group position={[0, -0.42, 0]} rotation={[-a[1], 0, 0]}>
              <VoxModel build={foreArm} seed={8} />
            </group>
          </group>
        ))}
      </group>
      {([[-1, legL, kneeL], [1, legR, kneeR]] as const).map(([s, a, k]) => (
        <group key={s} position={[s * 0.16, 1.04 + bob, 0]} rotation={[a, 0, 0]}>
          <VoxModel build={thigh} seed={9} />
          <group position={[0, -0.46, 0]} rotation={[k, 0, 0]}>
            <VoxModel build={shin} seed={10} />
          </group>
        </group>
      ))}
    </group>
  );
};
