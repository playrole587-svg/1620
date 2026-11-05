// Hit effects, fog, fire and embers. Everything is drawn as whole art pixels (no soft sprites) and is a
// pure function of the film frame.

import React, { useMemo } from "react";
import { hash, hash2, fbm1 } from "../../kits/pixelstory/core/noise.ts";
import { bayer } from "../../kits/pixelstory/core/noise.ts";
import { hexToRgb } from "../../kits/pixelstory/core/palette.ts";
import { PixelCanvas } from "../../kits/pixelstory/pixel/PixelCanvas.tsx";
import { PX } from "../../kits/pixelstory/pixel/views.tsx";

// ---------- tiny RGBA buffer ----------
export type Buf = { w: number; h: number; d: Uint8ClampedArray };
export const newBuf = (w: number, h: number): Buf => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
export const setPx = (b: Buf, x: number, y: number, hex: string, a = 255) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= b.w || iy >= b.h) return;
  const [r, g, bl] = hexToRgb(hex);
  const i = (iy * b.w + ix) * 4;
  b.d[i] = r;
  b.d[i + 1] = g;
  b.d[i + 2] = bl;
  b.d[i + 3] = a;
};
export const discB = (b: Buf, cx: number, cy: number, r: number, hex: string, a = 255) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.2) setPx(b, x, y, hex, a);
};
export const lineB = (b: Buf, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, hex: string, a = 255) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    discB(b, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, hex, a);
  }
};

/** A buffer placed at set coordinates (ox, oy). */
export const FxCanvas: React.FC<{ buf: Buf; ox: number; oy: number; style?: React.CSSProperties }> = ({ buf, ox, oy, style }) => (
  <div style={{ position: "absolute", left: ox * PX, top: oy * PX, pointerEvents: "none", ...style }}>
    <PixelCanvas w={buf.w} h={buf.h} pixels={buf.d} scale={PX} />
  </div>
);

// ---------- hit spark ----------
/** Impact star: white burst → yellow star → orange ring and flying embers. `age` in film frames. */
export const HitSpark: React.FC<{ x: number; y: number; age: number; size: number; tone?: "warm" | "red" }> = ({ x, y, age, size, tone = "warm" }) => {
  if (age < 0 || age > 16) return null;
  const R = size;
  const S = Math.ceil(R * 3) | 1;
  const buf = newBuf(S, S);
  const c = (S - 1) / 2;
  const col = tone === "red" ? { a: "#FFFFFF", b: "#FF8A7A", c: "#E03A44", d: "#7A1520" } : { a: "#FFFFFF", b: "#FFE08A", c: "#FF9440", d: "#C2501F" };
  const spikes = (len: number, th: number, hex: string, diag = 0.62) => {
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4 + (age > 2 ? 0.1 : 0);
      const L = k % 2 === 0 ? len : len * diag;
      lineB(buf, c, c, c + Math.cos(ang) * L, c + Math.sin(ang) * L, th, 0.2, hex);
    }
  };
  if (age <= 2) {
    spikes(R * 1.15, 2.4, col.a);
    discB(buf, c, c, R * 0.42, col.a);
  } else if (age <= 5) {
    const k = (age - 2) / 3;
    spikes(R * (1.15 + k * 0.2), 1.5, col.b);
    discB(buf, c, c, R * 0.3 * (1 - k * 0.5), col.a);
    for (let a = 0; a < 40; a++) {
      const ang = (a / 40) * Math.PI * 2;
      setPx(buf, c + Math.cos(ang) * R * (0.7 + k * 0.4), c + Math.sin(ang) * R * (0.7 + k * 0.4), col.c);
    }
  } else {
    const k = (age - 5) / 11;
    for (let a = 0; a < 36; a++) {
      const ang = (a / 36) * Math.PI * 2;
      const rr = R * (1.0 + k * 0.5);
      if (hash(a * 7 + 3) > k * 0.9) setPx(buf, c + Math.cos(ang) * rr, c + Math.sin(ang) * rr, col.c);
    }
    for (let e = 0; e < 14; e++) {
      const ang = hash(e * 11 + 1) * Math.PI * 2;
      const sp = 0.5 + hash(e * 5 + 2) * 1.2;
      const d = R * 0.7 + sp * (age - 5) * 1.1;
      if (hash(e * 13 + 4) > k * 0.85) setPx(buf, c + Math.cos(ang) * d, c + Math.sin(ang) * d + (age - 5) * (age - 5) * 0.03, e % 3 === 0 ? col.b : col.d);
    }
  }
  return <FxCanvas buf={buf} ox={x - c} oy={y - c} />;
};

/** Expanding shock ring on the ground (flattened). */
export const ShockRing: React.FC<{ x: number; y: number; age: number; r: number; color?: string }> = ({ x, y, age, r, color = "#C9D6EE" }) => {
  if (age < 0 || age > 22) return null;
  const k = age / 22;
  const R = r * (0.25 + k * 0.95);
  const W = Math.ceil(R * 2 + 6);
  const H = Math.ceil(R * 0.7 + 6);
  const buf = newBuf(W, H);
  for (let a = 0; a < 140; a++) {
    const ang = (a / 140) * Math.PI * 2;
    if (hash(a * 3 + Math.floor(age / 3)) < k * 0.8) continue;
    setPx(buf, W / 2 + Math.cos(ang) * R, H / 2 + Math.sin(ang) * R * 0.32, color);
    if (k < 0.5) setPx(buf, W / 2 + Math.cos(ang) * (R - 1), H / 2 + Math.sin(ang) * (R - 1) * 0.32, "#FFFFFF");
  }
  return <FxCanvas buf={buf} ox={x - W / 2} oy={y - H / 2} />;
};

/** A thin dust/smoke puff that rises and thins out (pixel blobs). */
export const SmokePuff: React.FC<{ x: number; y: number; age: number; r?: number; seed?: number }> = ({ x, y, age, r = 12, seed = 1 }) => {
  const life = 54;
  if (age < 0 || age > life) return null;
  const k = age / life;
  const W = Math.ceil(r * 4);
  const buf = newBuf(W, W);
  for (let i = 0; i < 16; i++) {
    const ang = hash(i * 3 + seed) * Math.PI * 2;
    const dist = r * (0.2 + k * 1.1) * (0.4 + hash(i * 5 + seed));
    const br = (r * 0.38 + hash(i * 7 + seed) * r * 0.25) * (0.5 + k * 0.7);
    const px = W / 2 + Math.cos(ang) * dist;
    const py = W / 2 + Math.sin(ang) * dist * 0.7 - k * r * 0.9;
    for (let yy = Math.floor(py - br); yy <= Math.ceil(py + br); yy++)
      for (let xx = Math.floor(px - br); xx <= Math.ceil(px + br); xx++) {
        const d = Math.hypot(xx - px, yy - py);
        if (d > br) continue;
        if (bayer(xx, yy) < k * 0.95) continue;
        setPx(buf, xx, yy, d < br * 0.55 ? "#C3CFE6" : "#8696B5");
      }
  }
  return <FxCanvas buf={buf} ox={x - W / 2} oy={y - W / 2} />;
};

// ---------- slash lines ----------
/** A crescent-tapered slash that sweeps along its path then fades from the tail. */
export const Slash: React.FC<{ x0: number; y0: number; x1: number; y1: number; age: number; width?: number; colors?: [string, string, string] }> = ({
  x0, y0, x1, y1, age, width = 3.2, colors = ["#FFFFFF", "#FF7A6A", "#B3202C"],
}) => {
  if (age < 0 || age > 12) return null;
  const head = Math.min(1, (age + 1) / 3);
  const tail = Math.max(0, (age - 3) / 8);
  const minX = Math.floor(Math.min(x0, x1)) - 8;
  const minY = Math.floor(Math.min(y0, y1)) - 8;
  const W = Math.ceil(Math.abs(x1 - x0)) + 16;
  const H = Math.ceil(Math.abs(y1 - y0)) + 16;
  const buf = newBuf(W, H);
  const n = 60;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (t > head || t < tail) continue;
    const taper = Math.sin(Math.PI * ((t - tail) / Math.max(0.001, head - tail)));
    const px = x0 + (x1 - x0) * t - minX;
    const py = y0 + (y1 - y0) * t - minY;
    const w = width * (0.25 + 0.75 * taper) * (1 - tail * 0.4);
    discB(buf, px, py, w + 1.1, colors[2]);
    discB(buf, px, py, w * 0.75, colors[1]);
    discB(buf, px, py, w * 0.38, colors[0]);
  }
  return <FxCanvas buf={buf} ox={minX} oy={minY} />;
};

// ---------- fog ----------
const vnoise = (x: number, y: number, seed: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi + seed * 31, yi);
  const b = hash2(xi + 1 + seed * 31, yi);
  const c = hash2(xi + seed * 31, yi + 1);
  const d = hash2(xi + 1 + seed * 31, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm2 = (x: number, y: number, seed: number) => vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 3) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 5) * 0.15;

/** Dithered ground fog: one band of mist drifting sideways. */
export const Fog: React.FC<{ frame: number; y: number; h: number; speed?: number; density?: number; color?: string; seed?: number; ox?: number; w?: number; tint?: string }> = ({
  frame, y, h, speed = 0.03, density = 0.5, color = "#9DB1D4", seed = 1, ox = -20, w = 175, tint,
}) => {
  const t = frame * speed;
  const f2 = Math.floor(frame / 4) * 4; // drift in stepped holds, like animated pixel art
  const pixels = useMemo(() => {
    const b = newBuf(w, h);
    const tt = f2 * speed;
    for (let yy = 0; yy < h; yy++) {
      const fall = Math.sin(Math.PI * (yy / h)) ** 0.8; // thinner at the band's edges
      for (let xx = 0; xx < w; xx++) {
        const n = fbm2((xx + tt) * 0.06, yy * 0.16, seed);
        const v = n * fall * density * 1.6;
        if (v > 0.18 + bayer(xx, yy) * 0.34) setPx(b, xx, yy, v > 0.52 && tint ? tint : color, v > 0.5 ? 120 : 84);
      }
    }
    return b;
  }, [f2, h, w, density, color, seed, speed, tint]);
  void t;
  return <FxCanvas buf={pixels} ox={ox} oy={y} />;
};

// ---------- fire ----------
export const Flame: React.FC<{ x: number; y: number; frame: number; scale?: number; intensity?: number }> = ({ x, y, frame, scale = 1, intensity = 1 }) => {
  const f = Math.floor(frame / 4);
  const W = 17;
  const H = 24;
  const buf = newBuf(W, H);
  const h0 = (9 + fbm1(f * 0.7, 3) * 4 + 3) * scale * intensity;
  for (let yy = 0; yy < H; yy++) {
    const t = yy / H;
    const hh = H - 1 - yy; // height above the coals
    if (hh > h0 * 1.7) continue;
    const half = Math.max(0, (1 - hh / (h0 * 1.7)) ** 0.8) * 5 * scale + 0.4;
    const sway = fbm1(f * 0.5 + hh * 0.12, 7) * 2.2 * (hh / H);
    for (let xx = 0; xx < W; xx++) {
      const d = Math.abs(xx - (W - 1) / 2 - sway);
      if (d > half) continue;
      const core = 1 - d / half;
      const heat = core * 0.7 + (1 - hh / (h0 * 1.7)) * 0.5;
      const hex = heat > 0.95 ? "#FFF3C4" : heat > 0.7 ? "#FFD25A" : heat > 0.45 ? "#FF9440" : "#C2501F";
      if (hash2(xx + f * 5, yy) < 0.9 || heat > 0.5) setPx(buf, xx, yy, hex);
    }
    void t;
  }
  return <FxCanvas buf={buf} ox={x - (W - 1) / 2} oy={y - H + 2} style={{ mixBlendMode: "screen" }} />;
};

/** Embers drifting up off a brazier. */
export const Embers: React.FC<{ x: number; y: number; frame: number; count?: number; seed?: number }> = ({ x, y, frame, count = 9, seed = 1 }) => {
  const W = 40;
  const H = 70;
  const buf = newBuf(W, H);
  for (let i = 0; i < count; i++) {
    const period = 150 + hash(i * 3 + seed) * 90;
    const ph = ((frame + hash(i * 9 + seed) * period) % period) / period;
    const px = W / 2 + Math.sin(ph * 6 + i * 2.3) * (3 + ph * 7) + (hash(i * 7 + seed) - 0.5) * 6;
    const py = H - 6 - ph * (H - 8);
    const a = Math.sin(Math.PI * ph);
    if (a > 0.1) setPx(buf, px, py, ph < 0.45 ? "#FFD25A" : "#FF8A3C", Math.min(255, 70 + a * 230));
  }
  return <FxCanvas buf={buf} ox={x - W / 2} oy={y - H + 4} style={{ mixBlendMode: "screen" }} />;
};
