// Character-animation helpers on top of the engine's motion primitives.

import { Quaternion, Vector3 } from "three";
import { clamp, lerp, ease } from "../core/motion";
import type { V3 } from "./voxel";

export const v3lerp = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Yaw (about +Y, 0 = facing +Z) and pitch (positive = looking up) from one point to another. */
export const lookAngles = (from: V3, to: V3) => {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
};

/**
 * Look-target schedule: each entry takes over at `f` and is blended in over `blend`
 * frames, so attention shifts read as decisions, not interpolation.
 */
export type LookKey = { f: number; at: (frame: number) => V3; blend?: number };
export const lookTarget = (frame: number, keys: LookKey[]): V3 => {
  let cur = keys[0].at(frame);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.f) break;
    const t = ease.body(clamp((frame - k.f) / (k.blend ?? 12)));
    cur = v3lerp(cur, k.at(frame), t);
  }
  return cur;
};

/** 0 = open, 1 = shut. Quick close, short hold, slower open. */
export const blink = (frame: number, at: number[]) => {
  for (const b of at) {
    const t = frame - b;
    if (t < 0 || t > 9) continue;
    if (t < 2) return t / 2;
    if (t < 4) return 1;
    return 1 - (t - 4) / 5;
  }
  return 0;
};

/** Squash-and-stretch for a hop: returns {y, sy} given takeoff and landing frames. */
export const hop = (frame: number, takeoff: number, land: number, height: number) => {
  const pre = 7; // anticipation squash
  const post = 9; // landing squash + recovery
  if (frame < takeoff - pre || frame > land + post) return { y: 0, sy: 1 };
  if (frame < takeoff) {
    const t = (frame - (takeoff - pre)) / pre;
    return { y: 0, sy: 1 - 0.2 * ease.body(t) };
  }
  if (frame <= land) {
    const t = (frame - takeoff) / (land - takeoff);
    const y = 4 * height * t * (1 - t);
    const sy = 1 + 0.16 * (1 - Math.abs(t * 2 - 1)) * (t < 0.5 ? 1 : 0.6);
    return { y, sy };
  }
  const t = (frame - land) / post;
  return { y: 0, sy: 1 - 0.18 * Math.sin(Math.PI * t) * (1 - t * 0.5) };
};

const _a = new Vector3();
const _b = new Vector3();
const _p = new Vector3();
const _q = new Quaternion();
const DOWN = new Vector3(0, -1, 0);

/**
 * Two-bone IK in the parent's space. Bones hang along -Y at rest.
 * Returns quaternions for the upper bone (in parent space) and the lower bone
 * (in upper-bone space). `pole` is the direction the elbow/knee should point.
 */
export const twoBoneIK = (shoulder: V3, target: V3, l1: number, l2: number, pole: V3) => {
  const S = new Vector3(...shoulder);
  const T = new Vector3(...target);
  const dir = _a.copy(T).sub(S);
  let d = dir.length();
  d = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  dir.normalize();
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const P = _p.set(...pole).normalize();
  const poleP = _b.copy(P).sub(dir.clone().multiplyScalar(P.dot(dir))).normalize();
  const E = S.clone().add(dir.clone().multiplyScalar(l1 * cosA)).add(poleP.clone().multiplyScalar(l1 * sinA));
  const upperDir = E.clone().sub(S).normalize();
  const qU = new Quaternion().setFromUnitVectors(DOWN, upperDir);
  const W = S.clone().add(dir.clone().multiplyScalar(d)); // reachable wrist point
  const lowerDir = W.sub(E).normalize().applyQuaternion(_q.copy(qU).invert());
  const qL = new Quaternion().setFromUnitVectors(DOWN, lowerDir);
  return { qU, qL };
};
