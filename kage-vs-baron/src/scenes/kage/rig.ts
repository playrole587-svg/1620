// Puppet rig for the two fighters. Each pose is a handful of joint angles; limbs are drawn as thick
// tapered lines into an ASCII-style fill sprite, then `finish` adds the sel-out outline and form shading
// (same craft as the kit's character pattern, but every pose is generated instead of hand-typed).
//
// Angles are WORLD angles in degrees, measured from "straight down", positive toward the facing side
// (sprites face right; the Baron is flipped on screen):  0 = down, 90 = forward, 180 = up, -90 = back.
// Torso lean: 0 = upright, positive leans forward.

import { blank, type Palette, type Sprite } from "../../kits/pixelstory/pixel/sprite.ts";
import { finish, type FillSpec, type Material } from "../../kits/pixelstory/pixel/finish.ts";
import { ease, lerp, type Ease } from "../../kits/pixelstory/core/motion.ts";

export const CW = 104;
export const CH = 80;
const GY = 74; // ground row of the canvas
const HX = 52; // hip column of the canvas
const D2R = Math.PI / 180;

export type Pose = {
  lean: number;
  head: number;
  uF: number; fF: number; // front arm: upper, fore
  uB: number; fB: number; // back arm
  tF: number; sF: number; // front leg: thigh, shin
  tB: number; sB: number; // back leg
  hip: number; // hip height override (<0 = grounded automatically)
  dx: number; // body shift (cells)
  bl: number; // blade length (0 = none)
  ba: number; // blade angle
  sc: number; // scarf tail angle
  sw: number; // scarf wave amount
};

export const BASE: Pose = {
  lean: 6, head: 0, uF: 40, fF: 140, uB: 20, fB: 150,
  tF: 28, sF: -8, tB: -25, sB: -5, hip: -1, dx: 0, bl: 0, ba: 60, sc: -100, sw: 1,
};
export const P = (o: Partial<Pose>): Pose => ({ ...BASE, ...o });

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = { ...a } as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    // the hip override is "auto" (-1) in most poses: do not blend through the sentinel
    if (k === "hip" && (a.hip < 0 || b.hip < 0)) out.hip = t < 0.5 ? a.hip : b.hip;
    else out[k] = lerp(a[k], b[k], t);
  }
  return out;
};

export type PKey = { f: number; p: Pose; e?: Ease };

/** Pose of a keyframed clip at film frame f (each key's easing shapes the segment that ends on it). */
export const poseAt = (f: number, ks: PKey[]): Pose => {
  if (f <= ks[0].f) return ks[0].p;
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (f <= b.f) {
      const t = b.f === a.f ? 1 : (f - a.f) / (b.f - a.f);
      return lerpPose(a.p, b.p, (b.e ?? ease.body)(t));
    }
  }
  return ks[ks.length - 1].p;
};

// ---------- drawing on the fill canvas ----------
const put = (c: Sprite, x: number, y: number, ch: string) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= CW || iy >= CH) return;
  c.cells[iy * CW + ix] = ch;
};
const disc = (c: Sprite, cx: number, cy: number, r: number, ch: string) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) put(c, x, y, ch);
};
const thick = (c: Sprite, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ch: string) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disc(c, lerp(x0, x1, t), lerp(y0, y1, t), lerp(r0, r1, t), ch);
  }
};
const at = (c: Sprite, x: number, y: number) => {
  const ix = Math.round(x);
  const iy = Math.round(y);
  return ix < 0 || iy < 0 || ix >= CW || iy >= CH ? "." : c.cells[iy * CW + ix];
};
const dn = (a: number): [number, number] => [Math.sin(a * D2R), Math.cos(a * D2R)];

export type Ctx = { c: Sprite; p: Pose; t: number; hx: number; hy: number; sx: number; sy: number; cx: number; cy: number };

export type CharDef = {
  id: string;
  thigh: number; shin: number; torso: number; uarm: number; farm: number;
  headR: number;
  rLeg: [number, number]; rTorso: [number, number]; rArm: [number, number];
  rFist: number; footL: number;
  /** extra drawing after the torso (belts, plates) and after the head (face, crest, scarf) */
  body: (k: Ctx) => void;
  face: (k: Ctx) => void;
  /** scarf/plume drawn behind the head, before it */
  behind?: (k: Ctx) => void;
  pal: Palette;
  spec: Record<string, FillSpec>;
  anchor: { x: number; y: number };
};

/** Draw one pose to a finished (outlined, shaded) sprite. `t` is a film-frame clock for cloth. */
export const drawChar = (def: CharDef, p: Pose, t: number): Sprite => {
  const c = blank(CW, CH);
  const down = (a1: number, a2: number) => def.thigh * Math.cos(a1 * D2R) + def.shin * Math.cos(a2 * D2R);
  const hipH = p.hip >= 0 ? p.hip : Math.max(down(p.tF, p.sF), down(p.tB, p.sB));
  const hx = HX + p.dx;
  const hy = GY - hipH - 1;
  const [tx, ty] = [Math.sin(p.lean * D2R), -Math.cos(p.lean * D2R)];
  const sx = hx + tx * def.torso;
  const sy = hy + ty * def.torso;
  const hd = p.lean + p.head;
  const hr = def.headR;
  const cx = sx + Math.sin(hd * D2R) * (hr * 0.8 + 1.2);
  const cy = sy - Math.cos(hd * D2R) * (hr * 0.8 + 1.2);
  const k: Ctx = { c, p, t, hx, hy, sx, sy, cx, cy };

  const limb = (x: number, y: number, a1: number, a2: number, l1: number, l2: number, r: [number, number], ch: string) => {
    const [d1x, d1y] = dn(a1);
    const [d2x, d2y] = dn(a2);
    const kx = x + d1x * l1;
    const ky = y + d1y * l1;
    const ex = kx + d2x * l2;
    const ey = ky + d2y * l2;
    thick(c, x, y, kx, ky, r[0], (r[0] + r[1]) / 2 + 0.2, ch);
    thick(c, kx, ky, ex, ey, (r[0] + r[1]) / 2 + 0.2, r[1], ch);
    return { ex, ey };
  };
  const foot = (ex: number, ey: number, a2: number, ch: string) => {
    // foot points "forward" relative to the shin
    const fx = Math.cos(a2 * D2R);
    const fy = -Math.sin(a2 * D2R);
    thick(c, ex, ey + 0.5, ex + fx * def.footL, ey + 0.5 + fy * def.footL, 1.5, 1.2, ch);
  };

  // back arm and leg
  const bArm = limb(sx - 1, sy + 1, p.uB, p.fB, def.uarm, def.farm, def.rArm, "B");
  disc(c, bArm.ex, bArm.ey, def.rFist, "g");
  const bLeg = limb(hx - 1, hy, p.tB, p.sB, def.thigh, def.shin, def.rLeg, "B");
  foot(bLeg.ex, bLeg.ey, p.sB, "g");
  // torso
  thick(c, hx, hy, sx, sy, def.rTorso[0], def.rTorso[1], "T");
  def.behind?.(k);
  def.body(k);
  // head
  disc(c, cx, cy, hr, "H");
  def.face(k);
  // front leg and arm
  const fLeg = limb(hx + 1, hy, p.tF, p.sF, def.thigh, def.shin, def.rLeg, "F");
  foot(fLeg.ex, fLeg.ey, p.sF, "G");
  const fArm = limb(sx + 1, sy + 1, p.uF, p.fF, def.uarm, def.farm, def.rArm, "F");
  disc(c, fArm.ex, fArm.ey, def.rFist, "G");
  if (p.bl > 0) {
    const [bx, by] = dn(p.ba);
    thick(c, fArm.ex, fArm.ey, fArm.ex + bx * p.bl, fArm.ey + by * p.bl, 0.7, 0.45, "L");
    thick(c, fArm.ex - bx * 2, fArm.ey - by * 2, fArm.ex + bx * 1, fArm.ey + by * 1, 1.0, 1.0, "D");
  }
  return finish(c, def.spec);
};

const mat = (base: string, shade: string, light: string, out: string): Material => ({ base, shade, light, out });

// ---------- KAGE: shadow ninja ----------
const KAGE_PAL: Palette = {
  // suit family (navy, never black)
  a: "#2A3A63", b: "#1A2446", c: "#4A5F96", d: "#0B1022", // torso/head: base, shade, light, outline
  f: "#324676", g: "#202D55", h: "#5670AA", // front limbs
  i: "#17203F", j: "#0F1730", l: "#2B3A66", // back limbs
  w: "#C9C3B3", x: "#8E8878", y: "#EDE7D6", // wraps (hands and feet)
  v: "#8C877A", u: "#615E55", s: "#B5B0A2", // back wraps
  r: "#C8262E", q: "#7A1520", p: "#F0584A", // scarf
  k: "#0C1426", // mask interior
  e: "#FF5A44", // eye
  m: "#6E7A93", n: "#4A5468", o: "#A8B6D0", // belt/metal
  L: "#E6F2FF", // blade
};
const KAGE_SPEC: Record<string, FillSpec> = {
  T: { mat: mat("a", "b", "c", "d"), region: "torso" },
  H: { mat: mat("a", "b", "c", "d"), region: "head" },
  F: { mat: mat("f", "g", "h", "d"), region: "limbF" },
  B: { mat: mat("i", "j", "l", "d"), region: "limbB" },
  G: { mat: mat("w", "x", "y", "d"), region: "wrapF" },
  g: { mat: mat("v", "u", "s", "d"), region: "wrapB" },
  A: { mat: mat("r", "q", "p", "q"), region: "scarf" },
  D: { mat: mat("m", "n", "o", "d"), region: "metal" },
  k: { keep: "k", region: "mask" },
  e: { keep: "e", region: "eye" },
  L: { mat: mat("L", "o", "L", "n"), region: "blade" },
};

export const KAGE: CharDef = {
  id: "kage",
  thigh: 13, shin: 13, torso: 15, uarm: 9, farm: 10, headR: 5,
  rLeg: [3.0, 2.0], rTorso: [3.6, 4.2], rArm: [2.1, 1.7], rFist: 2.3, footL: 4,
  behind: ({ c, p, t, sx, sy, hx, hy }) => {
    // scarf tail: waves in the wind, trails behind the movement
    const nx = sx - 1;
    const ny = sy - 2;
    const n = 9;
    for (let i = 1; i <= n; i++) {
      const [dx, dy] = dn(p.sc);
      const wob = Math.sin(t * 0.16 - i * 0.75) * i * 0.34 * p.sw;
      const px = nx + dx * i * 2.7;
      const py = ny - Math.abs(dy) * i * 0.5 + dy * i * 1.4 + wob;
      disc(c, px, py, Math.max(0.9, 2.1 - i * 0.12), "A");
    }
    // belt knot tails
    thick(c, hx - 1, hy - 1, hx - 5, hy + 3 + Math.sin(t * 0.12) * 1.2, 1, 0.6, "A");
  },
  body: ({ c, hx, hy, sx, sy }) => {
    disc(c, hx, hy - 1, 3.4, "D"); // belt
    thick(c, hx, hy - 3, sx, sy + 1, 0.8, 0.8, "A"); // sash across chest
  },
  face: ({ c, cx, cy, p }) => {
    // mask band across the eyes, eye glint, hood knot with headband tails
    for (let y = Math.round(cy) - 1; y <= Math.round(cy) + 1; y++)
      for (let x = Math.round(cx) + 0; x <= Math.round(cx) + 6; x++) if (at(c, x, y) === "H") put(c, x, y, "k");
    put(c, cx + 3, cy, "e");
    put(c, cx + 2, cy, "e");
    put(c, cx + 4, cy - 1, "k");
    disc(c, cx - 5.5, cy + 1.2, 1.7, "H");
    thick(c, cx - 5, cy - 1, cx - 9 - p.sw * 1.5, cy + 1 + Math.sin(p.sc) * 0.5, 0.9, 0.6, "A");
  },
  pal: KAGE_PAL,
  spec: KAGE_SPEC,
  anchor: { x: HX + 1, y: GY + 1 },
};

// ---------- BARON BESI: iron knight ----------
const BARON_PAL: Palette = {
  a: "#7D8899", b: "#475164", c: "#B8C3D4", d: "#171C28", // torso/head steel
  f: "#8A95A7", g: "#505B6E", h: "#C7D1E0", // front limbs
  i: "#566072", j: "#363E4D", l: "#7A8497", // back limbs
  w: "#B8873A", x: "#7A5522", y: "#E8BC62", // gauntlets and boots (brass)
  v: "#86622B", u: "#55401D", s: "#B08B47", // back brass
  r: "#8B2536", q: "#4D1120", p: "#B94458", // plume
  k: "#13171F",
  e: "#FFB347", // visor glow
  m: "#C9A04A", n: "#7C5E26", o: "#F2D283", // trim
  P: "#A7B2C4", Q: "#667184", R: "#D6DFEC", // pauldron
};
const BARON_SPEC: Record<string, FillSpec> = {
  T: { mat: mat("a", "b", "c", "d"), region: "torso" },
  H: { mat: mat("a", "b", "c", "d"), region: "head" },
  F: { mat: mat("f", "g", "h", "d"), region: "limbF" },
  B: { mat: mat("i", "j", "l", "d"), region: "limbB" },
  G: { mat: mat("w", "x", "y", "d"), region: "wrapF" },
  g: { mat: mat("v", "u", "s", "d"), region: "wrapB" },
  A: { mat: mat("r", "q", "p", "q"), region: "plume" },
  D: { mat: mat("m", "n", "o", "d"), region: "trim" },
  P: { mat: mat("P", "Q", "R", "d"), region: "pauld" },
  k: { keep: "k", region: "mask" },
  e: { keep: "e", region: "eye" },
};

export const BARON: CharDef = {
  id: "baron",
  thigh: 14, shin: 13, torso: 16, uarm: 10, farm: 10, headR: 6,
  rLeg: [4.0, 3.2], rTorso: [5.2, 6.4], rArm: [3.4, 3.0], rFist: 3.7, footL: 6,
  behind: ({ c, p, t, cx, cy }) => {
    // plume streaming back from the helm crest
    const wave = (i: number) => Math.sin(t * 0.1 - i * 0.6) * (0.5 + i * 0.18) * p.sw;
    for (let i = 0; i < 9; i++) disc(c, cx - 1 - i * 1.7, cy - 6.4 + i * 0.35 + wave(i), Math.max(1, 2.2 - i * 0.12), "A");
  },
  body: ({ c, hx, hy, sx, sy }) => {
    // chest plate, belt, pauldron
    thick(c, hx + 2, hy - 6, sx + 2, sy + 1, 3.6, 4.4, "D");
    thick(c, hx, hy - 4, sx, sy + 4, 2.4, 3, "T");
    disc(c, hx, hy - 1, 4.8, "D");
    disc(c, sx + 1, sy + 1, 5.4, "P");
    disc(c, sx - 5, sy + 2, 3.2, "P");
  },
  face: ({ c, cx, cy }) => {
    // great helm: visor slit and breath slots, crest ridge
    for (let y = Math.round(cy) - 1; y <= Math.round(cy); y++)
      for (let x = Math.round(cx) - 1; x <= Math.round(cx) + 7; x++) if (at(c, x, y) === "H") put(c, x, y, "e");
    for (let y = Math.round(cy) + 2; y <= Math.round(cy) + 4; y += 2)
      for (let x = Math.round(cx) + 2; x <= Math.round(cx) + 5; x += 2) if (at(c, x, y) === "H") put(c, x, y, "k");
    disc(c, cx - 1, cy + 6.5, 3.2, "D"); // gorget
  },
  pal: BARON_PAL,
  spec: BARON_SPEC,
  anchor: { x: HX + 1, y: GY + 1 },
};

/** Every colour becomes the same bright tone: the one-or-two-frame white of a hit. */
export const flashPal = (pal: Palette, tone = "#F6F1E4"): Palette =>
  Object.fromEntries(Object.keys(pal).map((k) => [k, k === "d" || k === "q" ? "#E0D7C4" : tone]));
/** Dark silhouette copy (afterimage, eclipse backlight, K.O. visor off). */
export const tintPal = (pal: Palette, tone: string, keep: string[] = []): Palette =>
  Object.fromEntries(Object.keys(pal).map((k) => [k, keep.includes(k) ? pal[k] : tone]));

// ---------- poses ----------
export const POSES = {
  guard: P({}),
  guard2: P({ lean: 9, uF: 46, fF: 134, uB: 24, fB: 146, tF: 34, sF: -14, tB: -30, sB: -10, sw: 1.2 }),
  stepA: P({ lean: 12, tF: 42, sF: 2, tB: -36, sB: -16, uF: 30, fF: 130, uB: 40, fB: 120 }),
  stepB: P({ lean: 10, tF: 14, sF: -22, tB: -8, sB: 6, uF: 50, fF: 140, uB: 10, fB: 150 }),
  jabWind: P({ lean: 3, uF: 18, fF: 168, tF: 26, sF: -10 }),
  jabExt: P({ lean: 17, uF: 88, fF: 92, uB: 30, fB: 145, tF: 40, sF: -4, tB: -38, sB: -12, dx: 1 }),
  crossWind: P({ lean: 2, uF: 40, fF: 140, uB: 8, fB: 166, tF: 28, sF: -8 }),
  crossExt: P({ lean: 24, uF: 25, fF: 150, uB: 88, fB: 92, tF: 42, sF: -6, tB: -48, sB: -34, dx: 2 }),
  kickWind: P({ lean: -6, uF: 50, fF: 135, uB: 30, fB: 145, tF: 96, sF: 15, tB: -12, sB: -6 }),
  kickExt: P({ lean: -22, uF: -35, fF: -45, uB: 70, fB: 105, tF: 92, sF: 95, tB: -10, sB: -4, dx: -1 }),
  // roundhouse: leg high, body leaning away
  roundExt: P({ lean: -32, head: 8, uF: -50, fF: -70, uB: 80, fB: 120, tF: 118, sF: 120, tB: -8, sB: -2, dx: -2 }),
  hitA: P({ lean: -14, head: -16, uF: 6, fF: 38, uB: -18, fB: 32, tF: 14, sF: -12, tB: -36, sB: -26, dx: -3, sw: 2 }),
  hitB: P({ lean: -24, head: -22, uF: -10, fF: 20, uB: -30, fB: 10, tF: 8, sF: -22, tB: -42, sB: -34, dx: -5, sw: 2.4 }),
  flung: P({ lean: -55, head: -20, uF: -40, fF: -75, uB: -70, fB: -100, tF: 36, sF: 80, tB: 10, sB: 60, hip: 26, dx: -2, sw: 2.6, sc: -80 }),
  slide: P({ lean: -28, head: -14, uF: -20, fF: 20, uB: -40, fB: -10, tF: 40, sF: 4, tB: -10, sB: -52, hip: 15, dx: -3 }),
  kneel: P({ lean: 16, head: 22, uF: 8, fF: 60, uB: -22, fB: 12, tF: 78, sF: 35, tB: -10, sB: -88, hip: 13, sw: 0.5 }),
  baronWind: P({ lean: -4, uF: 160, fF: 175, uB: 140, fB: 170, tF: 24, sF: -10, tB: -28, sB: -8, dx: -1 }),
  baronSwing: P({ lean: 24, uF: 100, fF: 60, uB: 90, fB: 40, tF: 44, sF: 0, tB: -40, sB: -14, dx: 2 }),
  baronSlam: P({ lean: 32, head: 6, uF: 60, fF: 8, uB: 48, fB: 0, tF: 50, sF: 4, tB: -44, sB: -16, dx: 3 }),
  crouch: P({ lean: 34, head: 14, uF: -50, fF: -70, uB: -60, fB: -82, tF: 62, sF: 26, tB: -54, sB: -30, hip: 15, sc: -112 }),
  leap: P({ lean: 12, head: 2, uF: 150, fF: 170, uB: 130, fB: 160, tF: 80, sF: 12, tB: 30, sB: -40, hip: 22, sc: -60 }),
  dive: P({ lean: 40, head: 10, uF: 28, fF: 22, uB: -20, fB: -40, tF: -120, sF: -150, tB: -140, sB: -165, hip: 24, bl: 22, ba: 24, sc: -140, sw: 0.5 }),
  sheath: P({ lean: 14, head: 8, uF: 30, fF: 20, uB: 80, fB: 60, tF: 60, sF: 18, tB: -46, sB: -30, hip: 17, bl: 20, ba: -64, sc: -105, sw: 1.6 }),
  victory: P({ lean: 2, head: -6, uF: 150, fF: 172, uB: -15, fB: 5, tF: 18, sF: -4, tB: -22, sB: -4, bl: 24, ba: 168, sc: -100, sw: 2.2 }),
  lying: P({ lean: -88, head: -8, uF: -76, fF: -88, uB: -58, fB: -80, tF: 86, sF: 90, tB: 78, sB: 84, hip: 5, sw: 0.3 }),
  halfUp: P({ lean: -58, head: -12, uF: -60, fF: -78, uB: -40, fB: -62, tF: 70, sF: 60, tB: 60, sB: 64, hip: 10 }),
};
