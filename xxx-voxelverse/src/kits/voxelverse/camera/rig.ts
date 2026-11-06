// Camera language for VOXELVERSE films. A film is a list of shots; each shot is a list of timed keys
// (position, aim, lens). Between keys the move is a time-based Hermite spline with Catmull-Rom tangents,
// so speed carries through a key instead of stopping; the shot's first and last keys ease in and out.
// Focus is a world point per frame. `cameraAt(shots, f)` is pure: any frame renders alone.
// Frames here are film frames on a 60 fps clock (pass `frame / fps * 60`).

import { fbm1 } from "../core/noise";
import type { V3 } from "../lib/voxel";

export type CamKey = {
  f: number;
  pos: V3;
  at: V3;
  /** vertical field of view, degrees */
  fov: number;
};

export type Shot = {
  name: string;
  from: number;
  to: number;
  keys: CamKey[];
  /** what the lens focuses on (world point), as a function of frame */
  focus: (f: number) => V3;
  /** bokeh strength: blur per unit of depth away from the focus plane */
  aperture: number | ((f: number) => number);
  /** largest blur radius, as a fraction of the frame */
  maxBlur?: number;
  /** exposure multiplier (1 = neutral) */
  exposure: number;
  /** exponential fog density for this shot (thicker at street level, thinner for wides) */
  fog: number;
  /** handheld drift amplitude on the aim point (fraction of the aim distance) */
  handheld?: number;
};

export type CamState = { pos: V3; at: V3; fov: number; focusDist: number; aperture: number; maxBlur: number; exposure: number; fog: number; shot: Shot };

/** Hermite interpolation of a scalar sampled at key times, Catmull-Rom tangents, eased ends. */
const herm = (f: number, ts: number[], vs: number[]) => {
  const n = ts.length;
  if (f <= ts[0]) return vs[0];
  if (f >= ts[n - 1]) return vs[n - 1];
  let i = 0;
  while (f > ts[i + 1]) i++;
  const t0 = ts[i], t1 = ts[i + 1];
  const h = t1 - t0;
  const u = (f - t0) / h;
  const m = (k: number) => (k === 0 || k === n - 1 ? 0 : (vs[k + 1] - vs[k - 1]) / (ts[k + 1] - ts[k - 1]));
  const m0 = m(i) * h, m1 = m(i + 1) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * m1;
};

export const shotAt = (shots: Shot[], f: number) => shots.find((sh) => f >= sh.from && f < sh.to) ?? shots[shots.length - 1];

export const cameraAt = (shots: Shot[], f: number): CamState => {
  const sh = shotAt(shots, f);
  const ts = sh.keys.map((k) => k.f);
  const comp = (sel: (k: CamKey) => number) => herm(f, ts, sh.keys.map(sel));
  const pos: V3 = [comp((k) => k.pos[0]), comp((k) => k.pos[1]), comp((k) => k.pos[2])];
  const at: V3 = [comp((k) => k.at[0]), comp((k) => k.at[1]), comp((k) => k.at[2])];
  const hh = sh.handheld ?? 0;
  if (hh) {
    // operator drift: slow, low-amplitude, never a loop
    const d = Math.hypot(at[0] - pos[0], at[1] - pos[1], at[2] - pos[2]);
    at[0] += fbm1(f / 70, 11) * hh * d;
    at[1] += fbm1(f / 80, 12) * hh * d * 0.7;
  }
  const fv = sh.focus(f);
  const dir = [at[0] - pos[0], at[1] - pos[1], at[2] - pos[2]];
  const dl = Math.hypot(dir[0], dir[1], dir[2]);
  const focusDist = Math.max(0.1, ((fv[0] - pos[0]) * dir[0] + (fv[1] - pos[1]) * dir[1] + (fv[2] - pos[2]) * dir[2]) / dl);
  const aperture = typeof sh.aperture === "number" ? sh.aperture : sh.aperture(f);
  return { pos, at, fov: comp((k) => k.fov), focusDist, aperture, maxBlur: sh.maxBlur ?? 0.01, exposure: sh.exposure, fog: sh.fog, shot: sh };
};
