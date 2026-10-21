// Keyframe engine ("hyperframes" substitute): every animated property in the film is a track of
// keyframes {t, ...values, ease}. Numeric values are interpolated with the easing of the
// *destination* key; strings/booleans hold until the next key (step interpolation).
// Times are in seconds, relative to the start of the scene.

import timeline from '../data/timeline.json';

export type EaseName =
  | 'linear'
  | 'inQuad'
  | 'outQuad'
  | 'inOutQuad'
  | 'inCubic'
  | 'outCubic'
  | 'inOutCubic'
  | 'outBack'
  | 'inBack'
  | 'inOutBack'
  | 'outElastic'
  | 'inOutSine'
  | 'outExpo'
  | 'inExpo'
  | 'hold';

export const ease: Record<EaseName, (x: number) => number> = {
  linear: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  inBack: (x) => {
    const c1 = 1.70158;
    return (c1 + 1) * x * x * x - c1 * x * x;
  },
  inOutBack: (x) => {
    const c2 = 1.70158 * 1.525;
    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  },
  outElastic: (x) => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  },
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  hold: () => 0,
};

export type Key = {t: number; ease?: EaseName} & Record<string, number | string | boolean | undefined>;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Sample a keyframe track at time t (seconds). Returns merged values. */
export function sample<T extends Record<string, unknown>>(track: Key[], t: number): T {
  if (track.length === 0) return {} as T;
  const out: Record<string, unknown> = {};
  // carry forward every property so sparse keys are allowed
  const keys = new Set<string>();
  track.forEach((k) => Object.keys(k).forEach((p) => p !== 't' && p !== 'ease' && keys.add(p)));
  for (const prop of keys) {
    let prev: Key | undefined;
    let next: Key | undefined;
    for (const k of track) {
      if (k[prop] === undefined) continue;
      if (k.t <= t) prev = k;
      else if (!next) next = k;
    }
    if (!prev && next) {
      out[prop] = next[prop];
      continue;
    }
    if (prev && !next) {
      out[prop] = prev[prop];
      continue;
    }
    if (!prev || !next) continue;
    const a = prev[prop];
    const b = next[prop];
    if (typeof a === 'number' && typeof b === 'number') {
      const e = ease[next.ease ?? 'inOutCubic'];
      const x = clamp01((t - prev.t) / Math.max(1e-6, next.t - prev.t));
      out[prop] = a + (b - a) * e(x);
    } else {
      out[prop] = a;
    }
  }
  return out as T;
}

/** 0→1 progress of a one-shot animation starting at `start` lasting `dur` seconds. */
export const prog = (t: number, start: number, dur: number, e: EaseName = 'outCubic') =>
  ease[e](clamp01((t - start) / dur));

/** Fade in at a, out at b (seconds). */
export const window01 = (t: number, a: number, b: number, fadeIn = 0.3, fadeOut = 0.3) =>
  Math.min(clamp01((t - a) / fadeIn), clamp01((b - t) / fadeOut));

export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

// ---------------------------------------------------------------------------
// Narration anchors: key times can reference narration segments, e.g. seg('s3b') or
// seg('s3b', 'end'), so visual events stay locked to the voice-over even if it is re-recorded.

type Seg = {id: string; start: number; end: number; words: {w: string; start: number; end: number}[]};
type Scene = {id: string; title: string; start: number; end: number; startFrame: number; durationFrames: number; segments: Seg[]};

export const scenes = timeline.scenes as Scene[];
export const FPS = timeline.fps;

export const sceneById = (id: string) => {
  const s = scenes.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

/** Segment time relative to its scene start. */
export function seg(id: string, edge: 'start' | 'end' = 'start'): number {
  for (const s of scenes) {
    const g = s.segments.find((x) => x.id === id);
    if (g) return g[edge] - s.start;
  }
  throw new Error(`unknown segment ${id}`);
}

/** Time (scene-relative) at which a given word of a segment is spoken (first match). */
export function word(id: string, w: string, edge: 'start' | 'end' = 'start'): number {
  for (const s of scenes) {
    const g = s.segments.find((x) => x.id === id);
    if (!g) continue;
    const hit = g.words.find((x) => x.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(w.toLowerCase()));
    if (!hit) throw new Error(`word ${w} not in ${id}`);
    return hit[edge] - s.start;
  }
  throw new Error(`unknown segment ${id}`);
}

export const sceneDuration = (id: string) => {
  const s = sceneById(id);
  return s.durationFrames / FPS;
};

/** Deterministic pseudo random in [0,1) */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Smooth 1D value noise in [-1,1] */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = rand(i + seed * 101.3) * 2 - 1;
  const b = rand(i + 1 + seed * 101.3) * 2 - 1;
  return a + (b - a) * u;
};
