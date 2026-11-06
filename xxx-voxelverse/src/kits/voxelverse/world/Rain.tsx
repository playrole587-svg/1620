// Rain. A dense volume of streaks anchored in world space but wrapped around the lens (so it never swims
// with the camera), ripples on the wet ground near the camera, and an optional sparse diorama-wide volume
// for wide shots. `blocked(x, y, z)` keeps drops out of interiors and from under awnings; `groundY(x, z)`
// tells ripples where the surface is. All motion is a pure function of the film frame (60 fps clock).

import React, { useLayoutEffect, useMemo } from "react";
import { AdditiveBlending, BoxGeometry, Color, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, RingGeometry, Vector3 } from "three";
import { rng } from "../core/noise";
import { clamp } from "../core/motion";
import { FX_LAYER } from "../lib/layers";
import type { CamState } from "../camera/rig";

const wrap = (v: number, lo: number, size: number) => lo + ((((v - lo) % size) + size) % size);

export type RainProps = {
  cam: CamState;
  /** film frame, 60 fps clock */
  f: number;
  /** 0..1 strength of the near volume */
  amount?: number;
  /** 0..1 strength of the diorama-wide volume (wide shots) */
  wide?: number;
  /** world area for the wide volume */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
  blocked?: (x: number, y: number, z: number) => boolean;
  groundY?: (x: number, z: number) => number;
  near?: number;
  far?: number;
  ripples?: number;
};

const BOX: [number, number, number] = [16, 11, 16];
const FALL = 9.5; // units per second
const WIND = 0.12; // slant

export const Rain: React.FC<RainProps> = ({ cam, f, amount = 1, wide = 0, bounds, blocked = () => false, groundY = () => 0.035, near = 2600, far = 3000, ripples = 260 }) => {
  const sys = useMemo(() => {
    const r = rng(77);
    const nearD = Array.from({ length: near }, () => [r(), r(), r(), 0.6 + r() * 0.8] as const);
    const farD = Array.from({ length: far }, () => [r(), r(), r(), 0.75 + r() * 0.5] as const);
    const rip = Array.from({ length: ripples }, () => [r(), r(), Math.floor(r() * 30)] as const);
    const mat = new MeshBasicMaterial({ color: new Color(0.42, 0.47, 0.48), transparent: true, opacity: 0.26, blending: AdditiveBlending, depthWrite: false, fog: false });
    const nearMesh = new InstancedMesh(new BoxGeometry(0.0045, 0.26, 0.0045), mat, near);
    const farMat = mat.clone();
    const farMesh = new InstancedMesh(new BoxGeometry(0.035, 0.9, 0.035), farMat, far);
    const ripMat = new MeshBasicMaterial({ color: new Color(1, 1, 1), transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false });
    const ripMesh = new InstancedMesh(new RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2), ripMat, ripples);
    for (const m of [nearMesh, farMesh, ripMesh]) {
      m.frustumCulled = false;
      m.layers.set(FX_LAYER);
    }
    return { nearD, farD, rip, nearMesh, farMesh, ripMesh, mat, farMat };
  }, [near, far, ripples]);

  useLayoutEffect(() => {
    const t = f / 60;
    const m = new Matrix4();
    const q = new Quaternion().setFromEuler(new Euler(0, 0, WIND));
    const s = new Vector3(1, 1, 1);
    const p = new Vector3();
    sys.mat.opacity = 0.26 * amount;
    const lo = [cam.pos[0] - BOX[0] / 2, cam.pos[1] - BOX[1] * 0.55, cam.pos[2] - BOX[2] / 2];
    sys.nearD.forEach(([a, b, c, sp], i) => {
      const y = wrap(b * BOX[1] - t * FALL * sp, lo[1], BOX[1]);
      const x = wrap(a * BOX[0] + y * WIND, lo[0], BOX[0]);
      const z = wrap(c * BOX[2], lo[2], BOX[2]);
      const tooClose = Math.hypot(x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]) < 0.7;
      const hidden = amount <= 0 || tooClose || y < groundY(x, z) || blocked(x, y, z);
      s.set(hidden ? 0 : 1, hidden ? 0 : sp, hidden ? 0 : 1);
      m.compose(p.set(x, y, z), q, s);
      sys.nearMesh.setMatrixAt(i, m);
    });
    sys.nearMesh.instanceMatrix.needsUpdate = true;

    sys.farMat.opacity = 0.16 * wide;
    sys.farD.forEach(([a, b, c, sp], i) => {
      let hidden = wide <= 0 || !bounds;
      let x = 0, y = 0, z = 0;
      if (bounds) {
        y = wrap(b * bounds.height - t * FALL * 1.3 * sp, 0, bounds.height);
        x = bounds.minX + a * (bounds.maxX - bounds.minX);
        z = bounds.minZ + c * (bounds.maxZ - bounds.minZ);
        hidden = hidden || Math.hypot(x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]) < 9 || blocked(x, y, z);
      }
      s.set(hidden ? 0 : 1, hidden ? 0 : sp, hidden ? 0 : 1);
      m.compose(p.set(x, y, z), q, s);
      sys.farMesh.setMatrixAt(i, m);
    });
    sys.farMesh.instanceMatrix.needsUpdate = true;

    // ripples: each spot re-fires on its own 30-frame cycle, near the camera only
    const col = new Color();
    const closeness = clamp(1 - (cam.pos[1] - 1) / 12) * amount;
    const F = Math.floor(f);
    sys.rip.forEach(([a, c, phase], i) => {
      const cyc = (F + phase) % 30;
      const gen = Math.floor((F + phase) / 30);
      const r = rng(i * 131 + gen * 7);
      const x = cam.pos[0] - 6 + ((a * 12 + r() * 3) % 12);
      const z = cam.pos[2] - 6 + ((c * 12 + r() * 3) % 12);
      const y = groundY(x, z) + 0.006;
      const k = cyc / 30;
      const rad = 0.02 + k * 0.09;
      const hidden = closeness <= 0 || blocked(x, y + 0.5, z);
      s.set(hidden ? 0 : rad, 1, hidden ? 0 : rad);
      m.compose(p.set(x, y, z), new Quaternion(), s);
      sys.ripMesh.setMatrixAt(i, m);
      col.setScalar((1 - k) * (1 - k) * 0.13 * closeness);
      sys.ripMesh.setColorAt(i, col);
    });
    sys.ripMesh.instanceMatrix.needsUpdate = true;
    if (sys.ripMesh.instanceColor) sys.ripMesh.instanceColor.needsUpdate = true;
  }, [f, sys, cam, amount, wide, bounds, blocked, groundY]);

  return (
    <group>
      <primitive object={sys.nearMesh} />
      <primitive object={sys.farMesh} />
      <primitive object={sys.ripMesh} />
    </group>
  );
};
