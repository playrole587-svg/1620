// React wrappers around the voxel kit and the instanced glow panes.

import React, { useLayoutEffect, useMemo } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Euler, Vector3, Texture } from "three";
import { useCurrentFrame } from "remotion";
import { mats, makeGlowPaneMaterial } from "./materials";
import { Vox } from "./voxel";

/** A static voxel model: authored once, merged per material, shadows on. */
export const VoxModel: React.FC<{
  build: (v: Vox) => void;
  seed?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ build, seed = 1, castShadow = true, receiveShadow = true, position, rotation }) => {
  const parts = useMemo(() => {
    const v = new Vox(seed);
    build(v);
    return v.build();
    // Models are authored once; `build` is a stable module-level function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const m = mats();
  return (
    <group position={position} rotation={rotation}>
      {parts.map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k]} castShadow={castShadow} receiveShadow={receiveShadow} />
      ))}
    </group>
  );
};

export type Pane = {
  pos: [number, number, number];
  size: [number, number];
  /** rotation about Y (0 = facing +Z) */
  rotY: number;
  tint: number | Color;
  cell?: 0 | 1 | 2 | 3;
  /** emission as a pure function of the frame */
  glow: (frame: number) => number;
};

const CELLS: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [0, 0.5],
  [0.5, 0.5],
];

/**
 * Every lit-able window or bulb in a set of panes, as one instanced draw call. `f` is the clock passed to
 * each pane's `glow` (pass film frames on a 60 fps clock so preview and final match); defaults to the
 * composition frame.
 */
export const GlowPanes: React.FC<{ panes: Pane[]; atlas?: Texture | null; base?: number; castShadow?: boolean; f?: number }> = ({
  panes,
  atlas = null,
  base,
  f,
}) => {
  const current = useCurrentFrame();
  const frame = f ?? current;
  const { mesh, glow } = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const n = panes.length;
    const glowAttr = new InstancedBufferAttribute(new Float32Array(n), 1);
    const tint = new Float32Array(n * 3);
    const cell = new Float32Array(n * 2);
    const mesh = new InstancedMesh(geo, makeGlowPaneMaterial(atlas, base), n);
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const c = new Color();
    panes.forEach((p, i) => {
      m.compose(new Vector3(...p.pos), q.setFromEuler(e.set(0, p.rotY, 0)), new Vector3(p.size[0], p.size[1], 1));
      mesh.setMatrixAt(i, m);
      c.set(p.tint as Color);
      tint.set([c.r, c.g, c.b], i * 3);
      cell.set(CELLS[p.cell ?? 0], i * 2);
    });
    geo.setAttribute("aGlow", glowAttr);
    geo.setAttribute("aTint", new InstancedBufferAttribute(tint, 3));
    geo.setAttribute("aCell", new InstancedBufferAttribute(cell, 2));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    return { mesh, glow: glowAttr };
  }, [panes, atlas, base]);

  useLayoutEffect(() => {
    for (let i = 0; i < panes.length; i++) glow.array[i] = panes[i].glow(frame);
    glow.needsUpdate = true;
  }, [frame, panes, glow]);

  return <primitive object={mesh} />;
};
