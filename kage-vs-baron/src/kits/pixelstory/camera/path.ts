import { fbm1 } from "../core/noise";
import { keys, springFollow, type Ease } from "../core/motion";
import { restCamera, type CameraState } from "./CinematicCamera";

type Channel = keyof CameraState;
export type CamKey = { f: number; e?: Ease } & Partial<CameraState>;

/**
 * Keyframed camera. Each channel interpolates only between the keys that set it,
 * so a dolly and a tilt can start and end at different times.
 */
export const cameraAt = (frame: number, ks: CamKey[], base: CameraState = restCamera): CameraState => {
  const out = { ...base };
  for (const ch of Object.keys(base) as Channel[]) {
    const track = ks.filter((k) => k[ch] !== undefined).map((k) => ({ f: k.f, v: k[ch] as number, e: k.e }));
    if (track.length) out[ch] = keys(frame, track);
  }
  return out;
};

/**
 * Operator drift: the slow, low-amplitude float of a camera on a fluid head.
 * Not shake — periods are seconds long and amplitudes are a few pixels.
 */
export const drift = (frame: number, seed = 1, amp = { x: 4, y: 3, roll: 0.06 }) => ({
  x: fbm1(frame / 140, seed) * amp.x,
  y: fbm1(frame / 170, seed + 9) * amp.y,
  roll: fbm1(frame / 200, seed + 21) * amp.roll,
});

/** Lagged tracking of a moving subject — the camera follows motivation, late and smooth. */
export const follow = (
  frame: number,
  target: (f: number) => { x: number; y: number },
  opts: { start?: number; stiffness?: number; damping?: number } = {},
) => {
  const o = { start: opts.start ?? 0, stiffness: opts.stiffness ?? 40, damping: opts.damping ?? 13 };
  return {
    x: springFollow((f) => target(f).x, frame, o).value,
    y: springFollow((f) => target(f).y, frame, o).value,
  };
};
