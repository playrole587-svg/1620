import React from "react";
import { AbsoluteFill } from "remotion";
import { rgba } from "../core/palette";
import { PX } from "../pixel/views";

// Lens and atmosphere: what the light does in the air and inside the camera.
// Positions are in set coordinates (art px) so these live inside a camera Layer.

/** Additive bloom around a practical light. */
export const Glow: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  intensity: number;
  squash?: number;
}> = ({ x, y, r, color, intensity, squash = 1 }) =>
  intensity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: (x - r) * PX,
        top: (y - r * squash) * PX,
        width: r * 2 * PX,
        height: r * 2 * squash * PX,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${rgba(color, Math.min(1, intensity))} 0%, ${rgba(color, Math.min(1, intensity) * 0.35)} 38%, ${rgba(color, 0)} 100%)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );

/** Volumetric cone: light made visible by dust in the air. Soft-edged, never a wedge. */
export const LightShaft: React.FC<{
  x: number;
  y: number;
  angle: number;
  length: number;
  spread: number;
  color: string;
  intensity: number;
  id: string;
}> = ({ x, y, angle, length, spread, color, intensity, id }) => {
  const L = length * PX;
  const H = Math.tan(spread) * L;
  const pad = 80;
  return (
    <svg
      width={L + pad * 2}
      height={H * 2 + pad * 2}
      style={{
        position: "absolute",
        left: x * PX - pad,
        top: y * PX - H - pad,
        transformOrigin: `${pad}px ${H + pad}px`,
        transform: `rotate(${angle}rad)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={intensity} />
          <stop offset="0.55" stopColor={color} stopOpacity={intensity * 0.4} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <filter id={`${id}-b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <polygon
        points={`${pad},${H + pad - 10} ${L + pad},${pad} ${L + pad},${H * 2 + pad} ${pad},${H + pad + 10}`}
        fill={`url(#${id}-g)`}
        filter={`url(#${id}-b)`}
      />
    </svg>
  );
};

/** Optical vignette with a warm-dark falloff (never neutral black). */
export const Vignette: React.FC<{ strength?: number; color?: string; cx?: string; cy?: string }> = ({
  strength = 0.75,
  color = "#0D0809",
  cx = "50%",
  cy = "48%",
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 78% 62% at ${cx} ${cy}, ${rgba(color, 0)} 45%, ${rgba(color, strength * 0.55)} 78%, ${rgba(color, strength)} 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Film grain: seeded per frame so it is deterministic, light enough to stay texture. */
export const Grain: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 0.07 }) => (
  <AbsoluteFill style={{ mixBlendMode: "overlay", opacity, pointerEvents: "none" }}>
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <filter id={`grain-${frame}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1080" height="1920" filter={`url(#grain-${frame})`} />
    </svg>
  </AbsoluteFill>
);

/**
 * Split-tone grade: shadows pushed toward wine, highlights toward gold.
 * Applied once over the whole frame so every shot shares one look.
 */
export const Grade: React.FC<{ shadows?: string; highlights?: string; amount?: number }> = ({
  shadows = "#3D141D",
  highlights = "#F4B860",
  amount = 1,
}) => (
  <>
    <AbsoluteFill style={{ background: shadows, mixBlendMode: "lighten", opacity: 0.12 * amount, pointerEvents: "none" }} />
    <AbsoluteFill style={{ background: highlights, mixBlendMode: "soft-light", opacity: 0.08 * amount, pointerEvents: "none" }} />
  </>
);

/** Exposure flash / fade to a colour. */
export const Exposure: React.FC<{ color: string; amount: number; blend?: React.CSSProperties["mixBlendMode"] }> = ({
  color,
  amount,
  blend = "normal",
}) => (amount <= 0.001 ? null : <AbsoluteFill style={{ background: color, opacity: amount, mixBlendMode: blend, pointerEvents: "none" }} />);
