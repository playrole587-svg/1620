// Deterministic motion primitives. Every function is a pure function of the frame,
// so any frame can be rendered in isolation and in any order.

export type Ease = (t: number) => number;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number, ease: Ease = linear) =>
  lerp(c, d, ease(invLerp(a, b, v)));

export const linear: Ease = (t) => t;

// Curves are named by intent so scenes read like direction notes.
export const ease = {
  linear,
  // Camera: long, heavy, no visible start or stop.
  camera: (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  cameraSoft: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  // Arrivals: fast in, long settle.
  arrive: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  arriveSoft: (t: number) => 1 - (1 - t) ** 3,
  // Departures: slow start, accelerating exit.
  depart: (t: number) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  departSoft: (t: number) => t ** 3,
  // Mechanical lock with a small overshoot.
  lock: (t: number) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  // Organic in-out for body motion.
  body: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  // Snappy anticipation: dips below 0 before going.
  anticipate: (t: number) => {
    const c = 1.7;
    return t * t * ((c + 1) * t - c);
  },
  smooth: (t: number) => t * t * (3 - 2 * t),
} satisfies Record<string, Ease>;

/** 0→1 progress between two frames with an easing curve. */
export const ramp = (frame: number, from: number, to: number, e: Ease = linear) =>
  e(invLerp(from, to, frame));

export type Key = { f: number; v: number; e?: Ease };

/** Piecewise keyframes; each key's easing shapes the segment that ends on it. */
export const keys = (frame: number, ks: Key[]): number => {
  if (frame <= ks[0].f) return ks[0].v;
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (frame <= b.f) {
      const t = (frame - a.f) / (b.f - a.f);
      return lerp(a.v, b.v, (b.e ?? ease.body)(t));
    }
  }
  return ks[ks.length - 1].v;
};

/**
 * Damped spring that chases a driver signal, simulated from `start` to `frame`.
 * Used for follow-through on secondary parts (cowlick, antennae, hanging cards):
 * they respond to the parent's motion instead of running their own loop.
 */
export const springFollow = (
  driver: (f: number) => number,
  frame: number,
  { start = 0, stiffness = 180, damping = 12, mass = 1, fps = 60, substeps = 2 } = {},
) => {
  let x = driver(start);
  let v = 0;
  const dt = 1 / fps / substeps;
  const end = Math.max(start, Math.floor(frame));
  for (let f = start; f < end; f++) {
    const target = driver(f + 1);
    for (let s = 0; s < substeps; s++) {
      const a = (-stiffness * (x - target) - damping * v) / mass;
      v += a * dt;
      x += v * dt;
    }
  }
  return { value: x, offset: x - driver(end), velocity: v };
};

/** Step a continuous value to a limited frame rate, the way sprite animation holds poses. */
export const onTwos = (frame: number, step = 2) => Math.floor(frame / step) * step;
