// Props shared by the dioramas: palms, a sun light, mailbox, etc. All deterministic voxel builders.
import React from "react";
import { C } from "../../kits/voxelverse/lib/palette";
import type { Vox, V3 } from "../../kits/voxelverse/lib/voxel";
import type { SkyLook } from "../../kits/voxelverse/world/Atmosphere";
import { VoxModel } from "../../kits/voxelverse/lib/components";

export const GOLDEN: SkyLook = { top: 0x4d7fa6, mid: 0xefc08c, low: 0xf6a35b };

export const palm = (v: Vox, [x, y, z]: V3, h = 4.2, lean = 0.3) => {
  const seg = 9;
  let px = x, pz = z;
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const nx = x + lean * t * t * 1.6, nz = z + lean * 0.3 * t;
    const w = 0.34 - 0.12 * t;
    v.box([nx, y + (i + 0.5) * (h / seg), nz], [w, h / seg + 0.03, w], i % 2 ? 0x8a6a4a : 0x7a5c40, { r: 0.04, jitter: 0.05 });
    px = nx; pz = nz;
  }
  const top = y + h;
  v.box([px, top + 0.1, pz], [0.4, 0.3, 0.4], 0x5b4631, { r: 0.05 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + (x * 3.1);
    const dx = Math.cos(a), dz = Math.sin(a);
    let ax = px, ay = top + 0.2, az = pz;
    for (let s = 0; s < 4; s++) {
      const bx = ax + dx * 0.55, bz = az + dz * 0.55, by = ay + (s < 1 ? 0.28 : -0.2 - s * 0.14);
      v.rod([ax, ay, az], [bx, by, bz], 0.09 - s * 0.012, s < 2 ? C.leafLight : C.leaf, { mat: "foliage", r: 0.01 });
      // leaflets: two rows of narrow blades across the frond, drooping
      for (const u of [0.35, 0.7]) {
        const lx = ax + (bx - ax) * u, ly = ay + (by - ay) * u - 0.03, lz = az + (bz - az) * u;
        v.box([lx, ly, lz], [0.62 - s * 0.1, 0.025, 0.16], s % 2 ? C.leaf : C.leafLight, { mat: "foliage", r: 0.008, rot: [0, -(a + Math.PI / 2), 0.0] });
      }
      ax = bx; ay = by; az = bz;
    }
  }
};

export const mailbox = (v: Vox, [x, y, z]: V3) => {
  v.box([x, y + 0.5, z], [0.1, 1.0, 0.1], C.woodDark, { r: 0.015 });
  v.box([x, y + 1.08, z], [0.36, 0.26, 0.5], C.tealDeep, { mat: "satin", r: 0.04 });
  v.box([x + 0.2, y + 1.22, z], [0.03, 0.18, 0.04], C.orange, { r: 0.005 });
};

export const hedge = (v: Vox, [x, y, z]: V3, w: number, d = 0.7, h = 0.7) => {
  for (let i = 0; i < Math.round(w / 0.45); i++) {
    const hh = h * (0.85 + v.rand() * 0.3);
    v.box([x + 0.22 + i * 0.45, y + hh / 2, z], [0.5, hh, d], v.rand() < 0.5 ? C.leaf : C.leafLight, { mat: "foliage", r: 0.12, jitter: 0.08 });
  }
};

export const Palms: React.FC<{ list: { p: V3; h?: number; lean?: number }[] }> = ({ list }) => (
  <VoxModel seed={41} build={(v) => list.forEach((q) => palm(v, q.p, q.h, q.lean))} />
);

/** Warm key (low sun) + sky hemisphere + a cool fill; the shadow camera covers `size` metres. */
export const SunLight: React.FC<{ from?: V3; intensity?: number; size?: number; color?: number; fill?: number }> = ({ from = [18, 14, 20], intensity = 2.2, size = 24, color = 0xffd9a8, fill = 0.7 }) => (
  <group>
    <hemisphereLight args={[0xbcd4e6, 0x7a5c44, fill]} />
    <directionalLight position={from} intensity={intensity} color={color} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0003} shadow-normalBias={0.03}
      shadow-camera-left={-size} shadow-camera-right={size} shadow-camera-top={size} shadow-camera-bottom={-size} shadow-camera-near={1} shadow-camera-far={Math.hypot(...from) + size * 2} />
  </group>
);

export const stoop = (v: Vox, x: number, z: number, h: number) => {
  // steps, door, porch light — a front door set proud of the façade
  v.span([x - 0.9, 0.05, z + 0.0], [x + 0.9, h * 0.5, z + 0.7], C.stoneLight, { mat: "wet", r: 0.02 });
  v.span([x - 0.7, 0.05, z + 0.7], [x + 0.7, h * 0.25, z + 1.2], C.stoneLight, { mat: "wet", r: 0.02 });
  v.span([x - 0.5, h, z + 0.03], [x + 0.5, h + 2.2, z + 0.14], C.copperDark, { mat: "satin", r: 0.02 });
  v.span([x - 0.6, h + 2.2, z + 0.0], [x + 0.6, h + 2.32, z + 0.2], C.cream, { r: 0.02 });
  v.span([x - 0.6, h - 0.02, z + 0.0], [x - 0.5, h + 2.32, z + 0.2], C.cream, { r: 0.02 });
  v.span([x + 0.5, h - 0.02, z + 0.0], [x + 0.6, h + 2.32, z + 0.2], C.cream, { r: 0.02 });
  v.box([x + 0.32, h + 1.05, z + 0.17], [0.07, 0.07, 0.04], C.amberHot, { mat: "metal" });
};
