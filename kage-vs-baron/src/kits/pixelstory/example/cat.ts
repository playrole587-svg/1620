// Example character for the PIXELSTORY kit: a small ginger cat, drawn the way every character in this
// style is built — flat fills per part → `finish` (sel-out outline + form shading from one upper-left
// key) → memoised frames → a pose function. Replace it with the buyer's own cast; keep the pattern.

import { finish, type FillSpec, type Material } from "../pixel/finish.ts";
import { recolor, sprite, type Palette, type Sprite } from "../pixel/sprite.ts";

export const CAT_PAL: Palette = {
  o: "#3D1A12", // outline (a dark version of the fur, never black)
  f: "#D98A3D", // fur
  F: "#A85A26", // fur shade
  y: "#F4B866", // fur light
  s: "#B8642A", // stripe
  S: "#8E4720", // stripe shade
  w: "#F3E6CC", // white muzzle, chest, paws
  v: "#CDB596", // white shade
  e: "#1B1115", // eye
  p: "#EE8E73", // nose
};

const FUR: Material = { base: "f", shade: "F", light: "y", out: "o" };
const STRIPE: Material = { base: "s", shade: "S", light: "s", out: "o" };
const WHITE: Material = { base: "w", shade: "v", light: "w", out: "o" };
const SPEC: Record<string, FillSpec> = {
  b: { mat: FUR, region: "fur" },
  s: { mat: STRIPE, region: "fur" },
  W: { mat: WHITE, region: "fur" },
  e: { keep: "e", region: "eye" },
  p: { keep: "p", region: "nose" },
};

// 18 × 11 fills, facing right. The head and body rows are shared; legs and tail change per frame.
const HEAD_BODY = [
  ".b.........bb...bb",
  ".b.........bbbbbbb",
  ".b.........bebbbeb",
  ".bb........bbWpWbb",
  "..bbsbbsbbbbbWWWb.",
  "..bbbsbbsbbbbbWb..",
  "..bbbbbbbbbbbbb...",
  "..bWWbbbbbbbbWb...",
];
const LEGS = {
  stride: ["..bb........bb....", ".bb..........bb...", ".WW..........WW..."],
  pass: ["...bb......bb.....", "....bb....bb......", "....WW....WW......"],
  stand: ["..bb.........bb...", "..bb.........bb...", "..WW.........WW..."],
} as const;
const SIT = [
  "...........bb...bb",
  "...........bbbbbbb",
  "...........bebbbeb",
  "...........bbWpWbb",
  "..........bbbWWWb.",
  ".........bbbbbWb..",
  "........bbsbbbbb..",
  ".......bbbsbbbbb..",
  ".......bbbbsbbbb..",
  ".bbbb..bbbbbbbWb..",
  "..bbbbbbWWbbbWW...",
];

export type CatPose = "stride" | "pass" | "stand" | "sit";

const cache = new Map<string, Sprite>();
const build = (pose: CatPose, tailFlick: boolean, blink: boolean): Sprite => {
  const key = `${pose}-${tailFlick}-${blink}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = pose === "sit" ? [...SIT] : [...HEAD_BODY, ...LEGS[pose]];
  // tail tip flicks one pixel back
  if (tailFlick && pose !== "sit") rows[0] = "b" + rows[0].slice(1).replace(/^b/, ".");
  let fill = sprite(rows);
  if (blink) fill = recolor(fill, { e: "b" });
  const out = finish(fill, SPEC);
  cache.set(key, out);
  return out;
};

/** Feet centre (art px inside the finished 20 × 13 sprite): place it on the floor line. */
export const CAT_ANCHOR = { x: 10, y: 12 };

/**
 * Pose for film frame `f` (60 fps clock). `walking` cycles stride/pass on fours (a pixel walk reads best
 * on a held, readable cadence); otherwise the cat stands or sits. Blinks every ~3 s.
 */
export const catAt = (f: number, state: "walk" | "stand" | "sit"): Sprite => {
  const blink = f % 190 < 6;
  if (state === "sit") return build("sit", false, blink);
  if (state === "stand") return build("stand", Math.floor(f / 40) % 3 === 0, blink);
  const step = Math.floor(f / 8) % 2;
  return build(step ? "pass" : "stride", step === 1, blink);
};
