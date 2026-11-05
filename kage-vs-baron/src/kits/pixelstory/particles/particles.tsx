import React from "react";
import { hash } from "../core/noise";
import { rgba } from "../core/palette";
import { PX } from "../pixel/views";

// Particles only where something motivates them: dust that is visible because a
// beam crosses it, steam because the coffee is hot, a trail because something bright
// moved. Every particle is a whole art pixel, never a soft dot.

const Px: React.FC<{ x: number; y: number; color: string; a: number; size?: number }> = ({ x, y, color, a, size = 1 }) =>
  a <= 0.02 ? null : (
    <div
      style={{
        position: "absolute",
        left: Math.round(x) * PX,
        top: Math.round(y) * PX,
        width: size * PX,
        height: size * PX,
        background: rgba(color, Math.min(1, a)),
      }}
    />
  );

/** Dust motes that only show inside a light cone. */
export const DustMotes: React.FC<{
  frame: number;
  x: number;
  y: number;
  angle: number;
  spread: number;
  length: number;
  count?: number;
  color?: string;
  intensity?: number;
  seed?: number;
}> = ({ frame, x, y, angle, spread, length, count = 28, color = "#FFD596", intensity = 1, seed = 3 }) => (
  <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
    {Array.from({ length: count }, (_, i) => {
      const d = 6 + hash(i * 7 + seed) * (length - 6);
      const a0 = angle + (hash(i * 13 + seed) - 0.5) * spread * 2.2;
      const t = frame / 60;
      const px = x + Math.cos(a0) * d + Math.sin(t * 0.35 + i * 1.7) * 2.2;
      const py = y + Math.sin(a0) * d - ((t * (0.6 + hash(i) * 0.8) + hash(i * 3) * 40) % 40) * 0.25 + Math.cos(t * 0.5 + i) * 1.2;
      let diff = Math.atan2(py - y, px - x) - angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const inCone = Math.max(0, 1 - Math.abs(diff) / (spread * 1.2));
      const dist = Math.hypot(px - x, py - y);
      const fall = Math.max(0, 1 - dist / length);
      const twinkle = 0.55 + 0.45 * Math.sin(t * 2.3 + i * 4.1);
      return <Px key={i} x={px} y={py} color={color} a={inCone * fall * twinkle * intensity * 0.9} />;
    })}
  </div>
);

/** Rising steam: pixel puffs that drift, thin out and vanish. */
export const Steam: React.FC<{ frame: number; x: number; y: number; intensity?: number; seed?: number }> = ({
  frame,
  x,
  y,
  intensity = 1,
  seed = 1,
}) => (
  <div style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: 6 }, (_, i) => {
      const period = 150;
      const t = ((frame + i * (period / 6) + seed * 37) % period) / period;
      const px = x + Math.sin(t * 5 + i * 2) * 1.6 + t * 2;
      const py = y - t * 22;
      const a = Math.sin(Math.PI * t) * 0.32 * intensity;
      return <Px key={i} x={px} y={py} color="#F3E6CC" a={a} size={t < 0.4 ? 1 : 2} />;
    })}
  </div>
);

/** Afterglow behind a moving light: sampled from its own path, so it can never drift off it. */
export const Trail: React.FC<{
  frame: number;
  path: (f: number) => { x: number; y: number } | null;
  length?: number;
  step?: number;
  color?: string;
  intensity?: number;
}> = ({ frame, path, length = 18, step = 2, color = "#FFD27A", intensity = 1 }) => (
  <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
    {Array.from({ length }, (_, i) => {
      const f = frame - (i + 1) * step;
      const p = path(f);
      if (!p) return null;
      const age = (i + 1) / length;
      const jitter = (hash(Math.floor(f / 2) * 31 + i) - 0.5) * 2 * age;
      return <Px key={i} x={p.x + jitter} y={p.y + jitter * 0.6} color={color} a={(1 - age) ** 1.6 * intensity} />;
    })}
  </div>
);

/** Pixels thrown off a breaking surface: each flies on its own ballistic path. */
export const Debris: React.FC<{
  frame: number;
  start: number;
  pieces: { x: number; y: number; color: string }[];
  spread?: number;
  gravity?: number;
  life?: number;
  seed?: number;
}> = ({ frame, start, pieces, spread = 1, gravity = 0.03, life = 50, seed = 5 }) => {
  const t = frame - start;
  if (t < 0 || t > life) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {pieces.map((p, i) => {
        const vx = (hash(i * 3 + seed) - 0.5) * 0.9 * spread;
        const vy = (-0.25 - hash(i * 5 + seed) * 0.5) * spread;
        const x = p.x + vx * t;
        const y = p.y + vy * t + gravity * t * t;
        return <Px key={i} x={x} y={y} color={p.color} a={1 - t / life} />;
      })}
    </div>
  );
};
