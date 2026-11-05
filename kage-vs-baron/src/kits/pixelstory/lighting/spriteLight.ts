import type { Light } from "./relight";
import type { SpriteLight } from "../pixel/sprite";

const strengthAt = (l: Light, x: number, y: number) => {
  const dx = l.x - x;
  const dy = l.y - y;
  let c = l.i / (1 + ((dx * dx + dy * dy) / (l.r * l.r)) * 3);
  if (l.kind === "cone") {
    let diff = Math.atan2(-dy, -dx) - l.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    c *= Math.abs(diff) < l.spread * 1.7 ? 1 : 0.15;
  }
  return c;
};

/**
 * The same lights that relight the set, translated into what a sprite at (x, y)
 * receives: a rim on the side facing each light, scaled by how much reaches it.
 */
export const spriteLightsAt = (
  lights: (Light & { color?: string })[],
  x: number,
  y: number,
  opts: { rim?: number; core?: number; width?: number } = {},
): SpriteLight[] =>
  lights
    .map((l) => {
      const c = strengthAt(l, x, y);
      return {
        dir: [l.x - x, l.y - y] as [number, number],
        color: l.color ?? "#FFD08A",
        rim: Math.min(0.95, c * (opts.rim ?? 0.9)),
        core: opts.core ?? 0.25,
        width: opts.width ?? 1,
      };
    })
    .filter((l) => l.rim > 0.04)
    .sort((a, b) => a.rim - b.rim);

/** Overall exposure of a sprite in a dark set: never black, never flat. */
export const spriteGainAt = (lights: Light[], x: number, y: number, ambient: number) => {
  const total = lights.reduce((s, l) => s + strengthAt(l, x, y), ambient);
  return Math.min(1.08, 0.42 + total * 0.38);
};
