// The arena: a collapsed temple courtyard at night. Five depth layers, each painted once as material +
// value (+ emission) and relit every frame by the film's lights.
//   sky (z 2600) → far temple in haze (z 2000) → ruined hall wall (z 1450) → floor + fighters (z 1150)
//   → dark foreground columns (z 650)

import { createAlbedo, painter } from "../../kits/pixelstory/environment/albedo.ts";
import { bayer, hash2, rng } from "../../kits/pixelstory/core/noise.ts";
import { sprite, type Palette, type Sprite } from "../../kits/pixelstory/pixel/sprite.ts";

/** Art-pixel anchors shared by paint, lights and overlays. */
export const MOON = { x: 92, y: 46, r: 15 };
export const FLOOR_TOP = 172; // where the floor starts
export const GROUND_Y = 204; // fighters' feet
export const BRAZIER_L = { x: 15, y: 176 };
export const BRAZIER_R = { x: 121, y: 176 };

type Painter = ReturnType<typeof painter>;

const jaggedTop = (p: Painter, x0: number, x1: number, baseY: number, seed: number, amp: number, bottom: number, mat: "nStone" | "nMist", val: number) => {
  const r = rng(seed);
  let y = baseY;
  for (let x = x0; x < x1; x++) {
    if (r() < 0.35) y += Math.round((r() - 0.5) * amp);
    y = Math.max(baseY - amp * 2, Math.min(baseY + amp * 2, y));
    p.rect(x, y, 1, bottom - y, mat, { val });
  }
};

/** A stone block wall with staggered joints, chips and cracks (material `nStone`). */
const blockWall = (p: Painter, x: number, y: number, w: number, h: number, seed: number, base: number) => {
  const r = rng(seed);
  let row = 0;
  for (let yy = y; yy < y + h; yy += 9, row++) {
    let xx = x - ((row * 7) % 16);
    while (xx < x + w) {
      const bw = 12 + Math.floor(r() * 10);
      const v = base + (r() - 0.5) * 0.14;
      for (let by = 0; by < 9 && yy + by < y + h; by++)
        for (let bx = 0; bx < bw; bx++) {
          const px = xx + bx;
          if (px < x || px >= x + w) continue;
          let val = v;
          if (by === 0) val *= 1.18; // lit top edge
          if (by === 8 || bx === bw - 1) val *= 0.46; // joint
          if (bx === 0 && by > 0) val *= 1.06;
          p.put(px, yy + by, "nStone", { val, jitter: 0.07, seed: row });
        }
      xx += bw;
    }
  }
};

const column = (p: Painter, x: number, top: number, bottom: number, w: number, seed: number, val: number) => {
  const r = rng(seed);
  for (let y = top; y < bottom; y++)
    for (let xx = 0; xx < w; xx++) {
      let v = val;
      const t = xx / (w - 1);
      v *= 0.55 + 0.75 * Math.sin(Math.PI * (0.15 + t * 0.7)); // round shaft
      if ((y - top) % 18 === 0) v *= 0.45; // drum joints
      p.put(x + xx, y, "nStone", { val: v, jitter: 0.06, seed });
    }
  // capital and base
  p.rect(x - 2, bottom - 5, w + 4, 5, "nStone", { val: val * 0.9, jitter: 0.04 });
  p.hline(x - 2, bottom - 5, w + 4, "nStone", { val: val * 1.2 });
  // cracks
  let cx = x + 2 + Math.floor(r() * (w - 4));
  for (let y = top + 6; y < bottom - 8; y += 2) {
    p.put(cx, y, "nStone", { val: 0.06 });
    if (r() < 0.5) cx += r() < 0.5 ? -1 : 1;
    cx = Math.max(x + 1, Math.min(x + w - 2, cx));
  }
};

export const buildSet = () => {
  // ---------- sky ----------
  const sky = createAlbedo(175, 230, -20, -10);
  const sp = painter(sky);
  for (let y = -10; y < 220; y++) {
    const t = Math.max(0, Math.min(1, (y + 10) / 170));
    for (let x = -20; x < 155; x++) sp.put(x, y, "nSky", { val: 0.2 + t * 0.52 + (hash2(x, y) - 0.5) * 0.03 });
  }
  const sr = rng(11);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(sr() * 170) - 20;
    const y = Math.floor(sr() * 100) - 8;
    sp.put(x, y, "nMoon", { val: 0.2, emit: 0.25 + sr() * 0.55 });
  }
  // wisps of cloud
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(sr() * 150) - 10;
    const cy = 20 + Math.floor(sr() * 70);
    for (let x = -14; x < 14; x++) {
      const k = Math.floor(2.4 * Math.sqrt(Math.max(0, 1 - (x / 14) ** 2)));
      for (let dy = 0; dy < k; dy++) sp.put(cx + x, cy + dy, "nSky", { val: 0.42 + 0.1 * (dy / Math.max(1, k)) });
    }
  }

  // ---------- far temple in haze ----------
  const far = createAlbedo(175, 130, -20, 78);
  const fp = painter(far);
  // mountains
  const mr = rng(5);
  let my = 112;
  for (let x = -20; x < 155; x++) {
    if (mr() < 0.3) my += Math.round((mr() - 0.5) * 5);
    my = Math.max(96, Math.min(124, my));
    fp.rect(x, my, 1, 160 - my, "nMist", { val: 0.26 });
  }
  // pagoda (left), tiers of curved eaves
  const pagoda = (cx: number, base: number, tiers: number, w0: number, val: number, broken = false) => {
    for (let i = 0; i < tiers; i++) {
      const y = base - i * 15;
      const w = w0 - i * 4;
      fp.rect(cx - w + 4, y - 11, (w - 4) * 2, 11, "nMist", { val: val * 0.9 });
      if (i === 1) fp.rect(cx - 2, y - 8, 4, 6, "nWarm", { val: 0.4, emit: 0.3 }); // a lit window
      fp.poly(
        [[cx - w - 4, y - 8], [cx - w, y - 6], [cx - w + 5, y - 11], [cx + w - 5, y - 11], [cx + w, y - 6], [cx + w + 4, y - 8],
          [cx + w - 2, y - 14], [cx, y - 20 + (broken && i === tiers - 1 ? 8 : 0)], [cx - w + 2, y - 14]],
        "nMist", { val },
      );
    }
    fp.rect(cx - 1, base - tiers * 15 - 14, 2, 8, "nMist", { val });
  };
  pagoda(24, 140, 4, 21, 0.34);
  pagoda(124, 142, 3, 16, 0.3, true);
  // dead trees
  for (const [tx, th] of [[60, 24], [74, 18], [48, 14]] as const) {
    fp.rect(tx, 140 - th, 2, th, "nMoss", { val: 0.18 });
    for (let k = 0; k < 4; k++) fp.line(tx + 1, 140 - th + k * 5, tx + (k % 2 ? 6 : -5), 140 - th + k * 5 - 5, "nMoss", { val: 0.18 });
  }
  // haze at the foot of the temple
  for (let y = 126; y < 150; y++)
    for (let x = -20; x < 155; x++) {
      const t = (y - 126) / 24;
      if (hash2(x, y * 3) < t * 0.8) fp.put(x, y, "nMist", { val: 0.5 + t * 0.12 });
    }

  // ---------- ruined hall wall (mid) ----------
  const mid = createAlbedo(175, 130, -20, 78);
  const mp = painter(mid);
  // left wall segment
  blockWall(mp, -20, 100, 80, 80, 31, 0.5);
  // collapse: knock a jagged hole in the top-right of the left segment
  const hr = rng(8);
  for (let x = 44; x < 62; x++) {
    const top = 100 + Math.floor(Math.abs(Math.sin(x * 0.6)) * 10 + hr() * 8) + (x - 44) * 1.2;
    for (let y = 96; y < top; y++) mp.put(x, y, "nStone", { val: 0 }); // placeholder, cleared below
  }
  // clear: write transparent by rebuilding mat for the collapsed pocket
  for (let x = 44; x < 100; x++)
    for (let y = 96; y < 176; y++) {
      const i = (y - mid.oy) * mid.w + (x - mid.ox);
      mid.mat[i] = 0;
    }
  // right wall segment, taller, with a surviving lintel
  blockWall(mp, 86, 84, 70, 100, 77, 0.5);
  jaggedTop(mp, 86, 108, 86, 4, 3, 90, "nStone", 0.5);
  // lintel beam of a gate (wood, warm) across the right section
  mp.rect(80, 92, 70, 5, "wood", { val: 0.18 });
  mp.hline(80, 92, 70, "wood", { val: 0.32 });
  // pillars
  column(mp, -6, 96, 184, 15, 3, 0.55);
  column(mp, 112, 74, 184, 17, 9, 0.55);
  // broken pillar stump in the gap
  column(mp, 66, 150, 184, 12, 14, 0.5);
  // paper lanterns hanging from the lintel (emissive)
  for (const lx of [100, 130]) {
    mp.vline(lx, 97, 7, "wood", { val: 0.2 });
    mp.rect(lx - 3, 104, 7, 9, "nWarm", { val: 0.55, emit: 0.28 });
    mp.hline(lx - 3, 104, 7, "wood", { val: 0.25 });
    mp.hline(lx - 3, 112, 7, "wood", { val: 0.25 });
  }
  // floor line shade
  mp.shade(-20, 170, 175, 14, 0.5);

  // ---------- floor ----------
  const ground = createAlbedo(175, 112, -20, FLOOR_TOP);
  const gp = painter(ground);
  const joints = [FLOOR_TOP, 182, 193, 206, 221, 238, 258];
  const fr = rng(61);
  for (let b = 0; b < joints.length - 1; b++) {
    const y0 = joints[b];
    const y1 = joints[b + 1];
    const slab = 18 + b * 6;
    let xx = -20 - ((b * 9) % slab);
    while (xx < 155) {
      const v = 0.5 + (fr() - 0.5) * 0.12 + b * 0.015;
      for (let y = y0; y < y1; y++)
        for (let x = 0; x < slab; x++) {
          const px = xx + x;
          if (px < -20 || px >= 155) continue;
          let val = v;
          if (y === y0) val *= 0.38; // joint
          else if (y === y0 + 1) val *= 1.15; // lit lip
          if (x === slab - 1) val *= 0.5;
          gp.put(px, y, "nStone", { val, jitter: 0.07, seed: b });
        }
      xx += slab;
    }
  }
  // cracks radiating across the arena
  const crack = (x0: number, y0: number, len: number, seed: number) => {
    const r2 = rng(seed);
    let x = x0;
    let y = y0;
    for (let i = 0; i < len; i++) {
      gp.put(x, y, "nStone", { val: 0.04 });
      if (r2() < 0.4) gp.put(x + 1, y, "nStone", { val: 0.04 });
      x += r2() < 0.6 ? 1 : 0;
      y += r2() < 0.7 ? 1 : r2() < 0.5 ? 0 : -1;
    }
  };
  crack(52, 184, 40, 3);
  crack(80, 176, 44, 5);
  crack(30, 200, 26, 9);
  crack(100, 214, 32, 12);
  // moss and grass tufts breaking through
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(fr() * 170) - 18;
    const y = FLOOR_TOP + 2 + Math.floor(fr() * 96);
    if (hash2(x, y) < 0.7) gp.put(x, y, "nMoss", { val: 0.35 + fr() * 0.3 });
    if (fr() < 0.3) gp.put(x, y - 1, "nMoss", { val: 0.45 });
  }
  // moon puddle (reflective)
  const puddle = { x: 66, y: 222, rx: 18, ry: 4 };
  for (let y = puddle.y - puddle.ry; y <= puddle.y + puddle.ry; y++)
    for (let x = puddle.x - puddle.rx; x <= puddle.x + puddle.rx; x++) {
      const d = ((x - puddle.x) / puddle.rx) ** 2 + ((y - puddle.y) / puddle.ry) ** 2;
      if (d <= 1) gp.put(x, y, "nSky", { val: 0.45 + (1 - d) * 0.2, emit: d < 0.2 ? 0.35 : 0.08 });
    }
  // warm pools around the braziers (dithered edge)
  for (const b of [BRAZIER_L, BRAZIER_R])
    for (let y = FLOOR_TOP; y < FLOOR_TOP + 60; y++)
      for (let x = b.x - 28; x <= b.x + 28; x++) {
        const d = Math.hypot((x - b.x) / 1.4, (y - (b.y + 14)) / 0.8) / 24;
        if (d < 1 && bayer(x, y) < (1 - d) * 1.15 - 0.1) {
          const i = (y - ground.oy) * ground.w + (x - ground.ox);
          if (i >= 0 && i < ground.mat.length && ground.mat[i]) {
            gp.put(x, y, "nWarm", { val: ground.val[i] * 0.95 });
          }
        }
      }
  // rubble
  for (const [rx0, ry0, rw, rh] of [[40, 228, 8, 4], [96, 232, 10, 5], [118, 222, 6, 3], [8, 224, 9, 5]] as const) {
    gp.rect(rx0, ry0, rw, rh, "nStone", { val: 0.5, jitter: 0.12 });
    gp.hline(rx0, ry0, rw, "nStone", { val: 0.78 });
    gp.hline(rx0, ry0 + rh, rw, "nStone", { val: 0.08 });
  }
  // braziers: stone bowl on a stand (fire is animated in the film)
  for (const b of [BRAZIER_L, BRAZIER_R]) {
    gp.rect(b.x - 2, b.y - 2, 5, 14, "nStone", { val: 0.46 });
    gp.rect(b.x - 6, b.y - 6, 13, 5, "nStone", { val: 0.5 });
    gp.hline(b.x - 6, b.y - 6, 13, "nStone", { val: 0.85 });
    gp.rect(b.x - 5, b.y - 8, 11, 2, "nWarm", { val: 0.5, emit: 0.55 }); // coals
    gp.rect(b.x - 5, b.y + 9, 11, 3, "nStone", { val: 0.4 });
    gp.shade(b.x - 7, b.y + 10, 15, 3, 0.4);
  }

  // ---------- foreground (dark, out of focus) ----------
  const fg = createAlbedo(90, 150, -20, 110);
  const fp2 = painter(fg);
  column(fp2, -16, 120, 258, 22, 21, 0.2);
  // broken column on the right edge (own buffer region)
  const fgR = createAlbedo(60, 110, 100, 150);
  const frp = painter(fgR);
  column(frp, 124, 190, 258, 20, 33, 0.18);
  jaggedTop(frp, 124, 144, 192, 6, 2, 260, "nStone", 0.18);
  // hanging vines at the top of the left foreground
  const vr = rng(9);
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.floor(vr() * 14);
    const len = 10 + Math.floor(vr() * 30);
    for (let y = 0; y < len; y++) fp2.put(x + Math.round(Math.sin(y * 0.3 + i) * 1.4), 110 + y + 6, "nMoss", { val: 0.16 + vr() * 0.06 });
  }

  return { sky, far, mid, ground, fg, fgR };
};

// ---------- moon sprite (eclipse-capable) ----------
export const MOON_PAL: Palette = {
  a: "#EEF4FF", b: "#CBD8F0", c: "#A8B8D6", d: "#7E8FB4",
  s: "#06070D", // shadow disc
  r: "#C0303A", t: "#7A1A26", u: "#E0505A", // corona
};

/** The moon at eclipse amount e: 0 = full moon, 1 = totally covered with a crimson corona. */
export const moonSprite = (e: number): Sprite => {
  const R = MOON.r;
  const S = R * 2 + 9;
  const c = S / 2;
  const rows: string[] = [];
  // shadow disc slides in from the upper right
  const off = (1 - e) * (R * 2 + 3);
  const sxc = c + off * 0.8;
  const syc = c - off * 0.6;
  for (let y = 0; y < S; y++) {
    let row = "";
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      let ch = ".";
      if (d <= R) {
        const n = hash2(x * 5, y * 7);
        ch = d > R - 2.2 ? "b" : n < 0.1 ? "d" : n < 0.26 ? "c" : "a";
        // maria: darker blotches
        if (Math.hypot(x - c + 4, y - c - 3) < 4.5 || Math.hypot(x - c - 5, y - c + 5) < 3) ch = n < 0.5 ? "c" : "b";
        const ds = Math.hypot(x + 0.5 - sxc, y + 0.5 - syc);
        if (ds < R + 0.6) ch = "s";
      } else if (e > 0.55) {
        const k = (e - 0.55) / 0.45;
        if (d <= R + 1.6) ch = d > R + 0.8 ? "u" : "r";
        else if (d <= R + 3.2 && hash2(x * 3, y * 11) < 0.55 * k) ch = "t";
        if (d <= R + 1.6 && k < 0.6 && hash2(x, y) > k + 0.2) ch = ".";
      }
      row += ch;
    }
    rows.push(row);
  }
  return sprite(rows);
};
export const MOON_ANCHOR = { x: MOON.r + 4.5, y: MOON.r + 4.5 };
