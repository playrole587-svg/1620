import React from "react";
import { clamp, ease, ramp, type Ease } from "../core/motion";
import { hash } from "../core/noise";
import { C, rgba } from "../core/palette";
import { FONT } from "./fonts";

// Each treatment exists for a reason in the story; none of them is a generic
// "word pops in". Pick by purpose:
//   MaskRise     — a statement arriving from behind a line (horizon, edge of frame)
//   LightSweep   — words that become visible because a light passes over them
//   PixelType    — diegetic pixel text, typed at the cadence of a machine
//   Counter      — a number that is counting something on screen
//   Crumble      — a word breaking into the style's own unit, the pixel

export type LineSpec = {
  text: string;
  font?: string;
  size: number;
  color?: string;
  italic?: boolean;
  tracking?: number;
  weight?: number | string;
  /** Horizontal offset in px, for asymmetric lockups. */
  dx?: number;
  shadow?: string;
};

const lineStyle = (l: LineSpec): React.CSSProperties => ({
  fontFamily: l.font ?? FONT.display,
  fontSize: l.size,
  lineHeight: 0.92,
  color: l.color ?? C.ivory,
  fontStyle: l.italic ? "italic" : "normal",
  fontWeight: l.weight ?? 400,
  letterSpacing: `${l.tracking ?? 0}em`,
  whiteSpace: "pre",
  textShadow: l.shadow,
});

/** Lines rise into view from behind their own baseline mask. */
export const MaskRise: React.FC<{
  frame: number;
  start: number;
  lines: LineSpec[];
  stagger?: number;
  duration?: number;
  curve?: Ease;
  exitAt?: number;
  exitDuration?: number;
  align?: "left" | "center" | "right";
  gap?: number;
  style?: React.CSSProperties;
}> = ({ frame, start, lines, stagger = 7, duration = 26, curve = ease.arrive, exitAt, exitDuration = 18, align = "center", gap = 0, style }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end", gap, ...style }}>
    {lines.map((l, i) => {
      const t = ramp(frame, start + i * stagger, start + i * stagger + duration, curve);
      const out = exitAt === undefined ? 0 : ramp(frame, exitAt + i * 3, exitAt + i * 3 + exitDuration, ease.depart);
      const y = (1 - t) * 108 - out * 108;
      return (
        <div key={i} style={{ overflow: "hidden", paddingTop: l.size * 0.08, paddingBottom: l.size * 0.04, marginLeft: l.dx ?? 0 }}>
          <div style={{ ...lineStyle(l), transform: `translateY(${y}%)` }}>{l.text}</div>
        </div>
      );
    })}
  </div>
);

/**
 * The words exist in the dark and are lit by a passing light: unlit → gold edge → ivory.
 * `progress` 0..1 is the light's position across the line (drive it from a real light).
 */
export const LightSweep: React.FC<{
  progress: number;
  line: LineSpec;
  edge?: string;
  softness?: number;
  style?: React.CSSProperties;
}> = ({ progress, line, edge = C.gold, softness = 10, style }) => {
  const p = progress * (100 + softness * 2) - softness;
  const base = line.color ?? C.ivory;
  return (
    <div
      style={{
        ...lineStyle(line),
        color: "transparent",
        backgroundImage: `linear-gradient(90deg, ${base} 0%, ${base} ${p - softness}%, ${edge} ${p - softness * 0.25}%, ${rgba(edge, 0)} ${p + softness * 0.4}%, ${rgba(edge, 0)} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        paddingBottom: line.size * 0.12,
        ...style,
      }}
    >
      {line.text}
    </div>
  );
};

/** Typed at a fixed machine cadence with a block cursor. */
export const PixelType: React.FC<{
  frame: number;
  start: number;
  text: string;
  size: number;
  color?: string;
  perChar?: number;
  cursor?: boolean;
  tracking?: number;
  style?: React.CSSProperties;
}> = ({ frame, start, text, size, color = C.ivory, perChar = 2, cursor = true, tracking = 0.12, style }) => {
  const n = clamp(Math.floor((frame - start) / perChar), 0, text.length);
  const done = n >= text.length;
  const blink = Math.floor(frame / 16) % 2 === 0;
  return (
    <div style={{ fontFamily: FONT.pixel, fontSize: size, color, letterSpacing: `${tracking}em`, whiteSpace: "pre", lineHeight: 1, ...style }}>
      {frame < start ? "" : text.slice(0, n)}
      {cursor && frame >= start && (!done || blink) ? (
        <span style={{ display: "inline-block", width: size * 0.6, height: size * 0.8, background: color, marginLeft: size * 0.08, verticalAlign: "-0.05em" }} />
      ) : null}
    </div>
  );
};

/** A zero-padded counter that eases toward its target like a projector spinning up. */
export const Counter: React.FC<{
  frame: number;
  from: number;
  to: number;
  start: number;
  end: number;
  digits?: number;
  size: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ frame, from, to, start, end, digits = 4, size, color = C.ivoryDim, style }) => {
  const t = ramp(frame, start, end, (x) => x * x * (3 - 2 * x));
  const v = Math.round(from + (to - from) * t);
  return (
    <div style={{ fontFamily: FONT.pixel, fontSize: size, color, letterSpacing: "0.1em", lineHeight: 1, ...style }}>
      {String(v).padStart(digits, "0")}
    </div>
  );
};

/**
 * A word breaks into tiles that fall away along a wave front (origin → outward).
 * Tiles are the style's pixel: the word dies the way the template does.
 */
export const Crumble: React.FC<{
  frame: number;
  start: number;
  line: LineSpec;
  width: number;
  height: number;
  tile?: number;
  /** Wave origin in px within the box, and speed in px per frame. */
  origin?: { x: number; y: number };
  speed?: number;
  style?: React.CSSProperties;
}> = ({ frame, start, line, width, height, tile = 24, origin = { x: 0, y: height / 2 }, speed = 30, style }) => {
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(height / tile);
  const t = frame - start;
  return (
    <div style={{ position: "relative", width, height, ...style }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const cx = (i % cols) * tile;
        const cy = Math.floor(i / cols) * tile;
        const reach = Math.hypot(cx - origin.x, cy - origin.y) / speed + hash(i) * 4;
        const life = t - reach;
        if (life > 40) return null;
        const fall = life > 0 ? life : 0;
        const dx = fall * (hash(i * 3) - 0.3) * 2.2;
        const dy = fall * fall * 0.35 - fall * 2.5 * hash(i * 7);
        const op = life > 0 ? clamp(1 - life / 34) : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: tile,
              height: tile,
              overflow: "hidden",
              opacity: op,
              transform: `translate(${Math.round(dx / 4) * 4}px, ${Math.round(dy / 4) * 4}px)`,
            }}
          >
            <div style={{ ...lineStyle(line), position: "absolute", left: -cx, top: -cy, width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {line.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
