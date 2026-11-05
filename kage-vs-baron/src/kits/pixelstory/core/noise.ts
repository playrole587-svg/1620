// Seeded randomness and smooth noise. No Math.random anywhere in the system.

export const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

export const hash2 = (a: number, b: number) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));

/** Seeded generator for building sets (book spines, tile orders, star fields). */
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
};

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed * 1013) * 2 - 1;
  const b = hash(i + 1 + seed * 1013) * 2 - 1;
  return a + (b - a) * fade(f);
};

/** Fractal 1D noise, for drifts and flicker that never visibly loop. */
export const fbm1 = (x: number, seed = 0, octaves = 3) => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq, seed + o * 17) * amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
};

// 4×4 Bayer matrix, normalised to (0,1). Used to dither between colour-ramp steps.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
