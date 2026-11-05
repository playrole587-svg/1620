// A spark: one pixel of a drawing that wakes up. Its heart is teal — the palette's
// only colour for "alive" — wrapped in gold light.

import { sprite, type Palette, type Sprite } from "../pixel/sprite.ts";

export const SPARK_PAL: Palette = {
  c: "#C9FFF4", // core
  t: "#3FB7A8", // living heart
  y: "#FFE9BC", // hot glow
  g: "#F4B860", // gold
  a: "#E8892E", // amber rays
};

const SIZES: Sprite[] = [
  sprite(["c"]),
  sprite([".g.", "gcg", ".g."]),
  sprite(["..a..", ".gyg.", "aytya", ".gyg.", "..a.."]),
  sprite(["...a...", "...g...", "..gyg..", "agytyga", "..gyg..", "...g...", "...a..."]),
  sprite([
    "....a....",
    "....g....",
    ".a..y..a.",
    "...gyg...",
    "agyytyyga",
    "...gyg...",
    ".a..y..a.",
    "....g....",
    "....a....",
  ]),
];

/** Pick a size (0–4); `twinkle` toggles the diagonal glints on twos. */
export const sparkSprite = (size: number, twinkle = false): Sprite => {
  const s = SIZES[Math.max(0, Math.min(SIZES.length - 1, Math.round(size)))];
  if (!twinkle || s.w < 9) return s;
  return { ...s, cells: s.cells.map((c, i) => ((i === 19 || i === 25 || i === 55 || i === 61) && c === "a" ? "." : c)) };
};
