// Reusable set pieces, painted into albedo buffers. Each prop takes a painter and a
// seed so a new set can reuse the vocabulary without repeating the exact layout.
// Values (val) describe material lightness; the scene's lights decide the final colour.

import type { RampName } from "../core/palette";
import { hash2, rng } from "../core/noise";
import type { painter as Painter } from "./albedo";

type P = ReturnType<typeof Painter>;

/** Vertical board wall with seams, grain, staggered joints and the odd knot. */
export const plankWall = (
  p: P,
  x: number,
  y: number,
  w: number,
  h: number,
  o: { board?: number; mat?: RampName; base?: number; seed?: number } = {},
) => {
  const board = o.board ?? 7;
  const mat = o.mat ?? "wood";
  const base = o.base ?? 0.5;
  const r = rng(o.seed ?? 3);
  for (let bx = x, i = 0; bx < x + w; bx += board, i++) {
    const v = base + (r() - 0.5) * 0.14;
    const joint = y + Math.floor(r() * h);
    const knotY = y + Math.floor(r() * h);
    const hasKnot = r() < 0.35;
    const grain = [1 + Math.floor(r() * (board - 2)), 1 + Math.floor(r() * (board - 2))];
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = 0; xx < board && bx + xx < x + w; xx++) {
        let val = v;
        if (xx === 0) val *= 0.32; // seam
        else if (xx === 1) val *= 1.12; // edge catching light
        if (grain.includes(xx)) val *= 0.86 + 0.08 * Math.sin(yy * 0.21 + i);
        if (yy === joint) val *= 0.4;
        if (hasKnot && Math.abs(yy - knotY) <= 1 && Math.abs(xx - board / 2) <= 1) val *= 0.62;
        p.put(bx + xx, yy, mat, { val, jitter: 0.05, seed: i });
      }
    }
  }
};

/** Heavy horizontal beam: top face, body, underside that catches light from below. */
export const beam = (p: P, x: number, y: number, w: number, h: number, seed = 5) => {
  const r = rng(seed);
  p.rect(x, y, w, h, "woodDark", { val: 0.5, jitter: 0.08, seed });
  for (let yy = y + 2; yy < y + h - 2; yy += 2 + Math.floor(r() * 2))
    for (let xx = x; xx < x + w; xx++) if (hash2(xx, yy) > 0.55) p.put(xx, yy, "woodDark", { val: 0.42 });
  p.hline(x, y, w, "woodDark", { val: 0.36, ny: -1 });
  p.hline(x, y + h - 1, w, "woodDark", { val: 0.85, ny: 1 });
  p.hline(x, y + h - 2, w, "woodDark", { val: 0.62, ny: 1 });
  for (let bx = x + 9; bx < x + w; bx += 26) {
    p.rect(bx, y + 3, 2, 2, "metal", { val: 0.7 });
    p.put(bx + 1, y + 4, "metal", { val: 0.35 });
  }
};

export const post = (p: P, x: number, y: number, w: number, h: number) => {
  p.rect(x, y, w, h, "woodDark", { val: 0.5, jitter: 0.08, seed: x });
  p.vline(x, y, h, "woodDark", { val: 0.3 });
  p.vline(x + w - 1, y, h, "woodDark", { val: 0.75, nx: 1 });
};

/** Diagonal knee brace from (x0,y0) to (x1,y1). */
export const brace = (p: P, x0: number, y0: number, x1: number, y1: number, t = 3) => {
  p.poly(
    [
      [x0, y0],
      [x0 + t, y0],
      [x1 + t, y1],
      [x1, y1],
    ],
    "woodDark",
    { val: 0.48, jitter: 0.06 },
  );
  p.line(x0, y0 + 1, x1, y1 + 1, "woodDark", { val: 0.75, ny: 1 });
};

/** Night window: frame, mullions, sky with stars, a crescent moon, a distant town. */
export const nightWindow = (p: P, x: number, y: number, w: number, h: number, seed = 11) => {
  const r = rng(seed);
  p.rect(x, y, w, h, "woodDark", { val: 0.5 });
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  for (let yy = 0; yy < ih; yy++)
    p.rect(ix, iy + yy, iw, 1, "sky", { val: 0.35, emit: 0.08 + (yy / ih) * 0.14 });
  for (let k = 0; k < 14; k++) {
    const sx = ix + Math.floor(r() * iw);
    const sy = iy + Math.floor(r() * ih * 0.6);
    p.put(sx, sy, "ivoryLit", { val: 0.2, emit: 0.35 + r() * 0.35 });
  }
  // crescent moon
  const mx = ix + iw * 0.72;
  const my = iy + ih * 0.22;
  p.disc(mx, my, 3.6, "paper", { val: 0.4, emit: 0.92 });
  p.disc(mx - 1.6, my - 1, 3.2, "sky", { val: 0.35, emit: 0.1 });
  // distant rooftops with a few lit windows
  let cx = ix;
  while (cx < ix + iw) {
    const bw = 3 + Math.floor(r() * 5);
    const bh = 4 + Math.floor(r() * 9);
    p.rect(cx, iy + ih - bh, bw, bh, "sky", { val: 0.25, emit: 0.03 });
    for (let k = 0; k < bw * bh * 0.05; k++)
      p.put(cx + Math.floor(r() * bw), iy + ih - bh + 1 + Math.floor(r() * (bh - 1)), "amberLamp", { val: 0.2, emit: 0.32 + r() * 0.22 });
    cx += bw;
  }
  // mullions
  p.rect(x + Math.floor(w / 2) - 1, y, 2, h, "woodDark", { val: 0.55 });
  p.rect(x, y + Math.floor(h * 0.45), w, 2, "woodDark", { val: 0.55 });
  p.hline(x, y + Math.floor(h * 0.45) + 1, w, "woodDark", { val: 0.8, ny: 1 });
  // sill
  p.rect(x - 2, y + h, w + 4, 2, "woodDark", { val: 0.7, ny: -1 });
  p.rect(x - 2, y + h + 2, w + 4, 2, "woodDark", { val: 0.45 });
};

/** Shelf board with brackets. */
export const shelf = (p: P, x: number, y: number, w: number) => {
  p.hline(x, y, w, "woodDark", { val: 0.8, ny: -1 });
  p.rect(x, y + 1, w, 2, "woodDark", { val: 0.5 });
  for (const bx of [x + 2, x + w - 4]) {
    p.rect(bx, y + 3, 2, 3, "woodDark", { val: 0.4 });
    p.put(bx + 1, y + 6, "woodDark", { val: 0.35 });
  }
};

/** A row of books standing on a shelf at yBase, with the odd prop between them. */
export const books = (p: P, x: number, yBase: number, w: number, seed = 1, props: ("reel" | "jar" | "lean")[] = []) => {
  const r = rng(seed);
  const mats: RampName[] = ["book1", "book2", "book3", "paper", "book1", "book2"];
  let cx = x;
  let pi = 0;
  while (cx < x + w - 2) {
    if (props[pi] && r() < 0.34) {
      const kind = props[pi++];
      if (kind === "reel") {
        p.disc(cx + 5, yBase - 6, 5.2, "metal", { val: 0.55 });
        p.ring(cx + 5, yBase - 6, 3.6, "metal", { val: 0.8 });
        for (const [dx, dy] of [[0, -2], [-2, 1], [2, 1]]) p.put(cx + 5 + dx, yBase - 6 + dy, "metal", { val: 0.12 });
        p.put(cx + 5, yBase - 6, "metal", { val: 0.9 });
        cx += 12;
        continue;
      }
      if (kind === "jar") {
        p.rect(cx + 1, yBase - 7, 5, 7, "paper", { val: 0.35 });
        p.vline(cx + 1, yBase - 7, 7, "paper", { val: 0.7 });
        for (let k = 0; k < 4; k++) p.vline(cx + 2 + (k % 3), yBase - 11 + (k % 2), 4, k === 1 ? "book1" : "book2", { val: 0.7 });
        cx += 8;
        continue;
      }
      if (kind === "lean") {
        p.poly([[cx, yBase], [cx + 3, yBase], [cx + 9, yBase - 11], [cx + 6, yBase - 12]], "book3", { val: 0.6 });
        cx += 9;
        continue;
      }
    }
    const bw = 2 + Math.floor(r() * 3);
    const bh = 8 + Math.floor(r() * 6);
    const m = mats[Math.floor(r() * mats.length)];
    const v = 0.45 + r() * 0.3;
    p.rect(cx, yBase - bh, bw, bh, m, { val: v });
    p.vline(cx, yBase - bh, bh, m, { val: v * 0.6 });
    p.hline(cx + 1, yBase - bh + 2, bw - 1, m, { val: v + 0.3 });
    p.hline(cx + 1, yBase - 3, bw - 1, m, { val: v * 0.7 });
    cx += bw + (r() < 0.15 ? 1 : 0);
  }
};

/** Writing desk: lit top, front edge, deep shadow underneath, legs and a drawer unit. */
export const desk = (p: P, x: number, y: number, w: number, floorY: number) => {
  for (let k = 0; k < 6; k++) p.rect(x, y + k, w, 1, "wood", { val: 0.6 + k * 0.02, ny: -1, jitter: 0.06, seed: 40 + k });
  for (let bx = x + 17; bx < x + w; bx += 23) p.vline(bx, y, 6, "wood", { val: 0.42, ny: -1 });
  p.hline(x, y + 6, w, "wood", { val: 0.95 });
  p.rect(x, y + 7, w, 3, "wood", { val: 0.55 });
  p.hline(x, y + 9, w, "wood", { val: 0.3 });
  p.rect(x + 2, y + 10, w - 4, floorY - y - 10, "plaster", { val: 0.12 });
  p.rect(x + 3, y + 10, 4, floorY - y - 10, "woodDark", { val: 0.42 });
  p.rect(x + w - 30, y + 10, 26, floorY - y - 13, "wood", { val: 0.38 });
  for (let k = 0; k < 2; k++) {
    const dy = y + 12 + k * 9;
    p.hline(x + w - 29, dy + 7, 24, "wood", { val: 0.18 });
    p.rect(x + w - 19, dy + 3, 4, 1, "metal", { val: 0.85 });
  }
};

/** Monitor casing and stand; the screen is drawn by a separate, dynamic layer. */
export const monitor = (p: P, x: number, y: number, w: number, h: number, standBase: number) => {
  p.rect(x, y, w, h, "metal", { val: 0.32 });
  p.hline(x, y, w, "metal", { val: 0.55, ny: -1 });
  p.vline(x, y, h, "metal", { val: 0.45 });
  p.hline(x, y + h - 1, w, "metal", { val: 0.22 });
  p.rect(x + 3, y + 3, w - 6, h - 6, "screen", { val: 0.2, emit: 0.12 });
  const cx = x + Math.floor(w / 2);
  p.rect(cx - 4, y + h, 8, standBase - (y + h) - 2, "metal", { val: 0.36 });
  p.vline(cx - 4, y + h, standBase - (y + h) - 2, "metal", { val: 0.55 });
  p.rect(cx - 10, standBase - 2, 20, 2, "metal", { val: 0.5, ny: -1 });
  p.put(x + w - 4, y + h - 2, "amberLamp", { val: 0.3, emit: 0.6 }); // power LED
};

/** Articulated desk lamp. Returns the bulb position and beam angle for the scene's light. */
export const deskLamp = (p: P, baseX: number, baseY: number) => {
  p.rect(baseX - 6, baseY - 3, 13, 3, "metal", { val: 0.5 });
  p.hline(baseX - 6, baseY - 3, 13, "metal", { val: 0.85, ny: -1 });
  const elbow: [number, number] = [baseX + 5, baseY - 28];
  const head: [number, number] = [baseX - 6, baseY - 40];
  for (const d of [0, 1]) {
    p.line(baseX + d, baseY - 3, elbow[0] + d, elbow[1], "metal", { val: 0.6 });
    p.line(elbow[0] + d, elbow[1], head[0] + d, head[1], "metal", { val: 0.6 });
  }
  p.disc(elbow[0], elbow[1], 1.6, "metal", { val: 0.85 });
  p.disc(head[0], head[1], 1.6, "metal", { val: 0.85 });
  // Shade: a cone aimed down-left at the keyboard. Thin metal glows faintly from
  // the bulb inside; the rim of the mouth is the hottest edge in the room.
  const shade: [number, number][] = [
    [head[0] + 3, head[1] - 4],
    [head[0] + 6, head[1] + 1],
    [head[0] - 4, head[1] + 15],
    [head[0] - 15, head[1] + 8],
  ];
  p.poly(shade, "amberLamp", { val: 0.3, emit: 0.04 });
  p.line(head[0] + 3, head[1] - 4, head[0] - 15, head[1] + 8, "amberLamp", { val: 0.6, ny: -1 });
  p.line(head[0] + 4, head[1] - 3, head[0] - 14, head[1] + 9, "amberLamp", { val: 0.45, ny: -1 });
  p.line(head[0] - 15, head[1] + 8, head[0] - 4, head[1] + 15, "amberLamp", { val: 1, emit: 0.62 });
  p.line(head[0] - 14, head[1] + 9, head[0] - 5, head[1] + 14, "amberLamp", { val: 1, emit: 0.9 });
  const bulb = { x: head[0] - 9, y: head[1] + 12 };
  return { bulb, angle: Math.atan2(1, -0.7), top: { x: head[0] - 5, y: head[1] - 1 } };
};

export const mug = (p: P, x: number, y: number) => {
  p.rect(x, y - 9, 7, 9, "paper", { val: 0.72 });
  p.vline(x, y - 9, 9, "paper", { val: 0.5 });
  p.vline(x + 6, y - 9, 9, "paper", { val: 0.55 });
  p.hline(x, y - 9, 7, "paper", { val: 0.95, ny: -1 });
  p.hline(x + 1, y - 8, 5, "woodDark", { val: 0.18 });
  p.ring(x + 8, y - 5, 2, "paper", { val: 0.62 });
  p.hline(x + 1, y - 4, 5, "book1", { val: 0.6 });
};

/** Potted pothos with heart leaves; vines trail over the desk edge. */
export const pothos = (p: P, x: number, y: number, seed = 7, trail = 18) => {
  const r = rng(seed);
  p.poly([[x, y - 12], [x + 12, y - 12], [x + 11, y], [x + 1, y]], "mesa", { val: 0.6 });
  p.hline(x - 1, y - 13, 14, "mesa", { val: 0.85, ny: -1 });
  p.hline(x, y - 12, 12, "mesa", { val: 0.35 });
  const leaf = (lx: number, ly: number, s: number) => {
    const v = 0.45 + r() * 0.4;
    p.disc(lx, ly, s, "leaf", { val: v });
    p.put(lx - 1, ly - 1, "leaf", { val: v + 0.25 });
    p.put(lx, ly + s, "leaf", { val: v * 0.7 });
  };
  for (let k = 0; k < 9; k++) leaf(x + 1 + r() * 11, y - 15 - r() * 14, 1.4 + r() * 1.3);
  for (const side of [0, 1]) {
    let vx = x + (side ? 11 : 2);
    let vy = y - 12;
    for (let k = 0; k < trail; k++) {
      vx += side ? 0.6 + r() * 0.5 : -(0.2 + r() * 0.4);
      vy += 1;
      p.put(vx, vy, "leaf", { val: 0.4 });
      if (k % 3 === 1) leaf(vx + (side ? 1 : -1), vy, 1.2 + r() * 0.6);
    }
  }
};

export const keyboard = (p: P, x: number, y: number, w: number) => {
  p.rect(x, y, w, 4, "metal", { val: 0.3, ny: -1 });
  for (let row = 0; row < 3; row++)
    for (let k = x + 1 + (row % 2); k < x + w - 1; k += 2) p.put(k, y + row + (row ? 0 : 0), "paper", { val: 0.32 + (row === 0 ? 0.1 : 0), ny: -1 });
  p.hline(x, y + 4, w, "metal", { val: 0.6 });
};

export const sketchbooks = (p: P, x: number, y: number) => {
  const stack: [RampName, number, number][] = [["book1", 15, 0.5], ["paper", 13, 0.7], ["book2", 14, 0.55]];
  stack.forEach(([m, w, v], k) => {
    const yy = y - (k + 1) * 2;
    p.rect(x + k, yy, w, 2, m, { val: v });
    p.hline(x + k, yy, w, m, { val: v + 0.25, ny: -1 });
    p.hline(x + k + 1, yy + 1, w - 2, "paper", { val: 0.6 });
  });
};

/** Floorboards running toward the camera: rows get taller as they come closer. */
export const floor = (p: P, x: number, y: number, w: number, h: number, seed = 9) => {
  const r = rng(seed);
  let yy = y;
  let rowH = 2;
  while (yy < y + h) {
    const v = 0.34 + r() * 0.08;
    p.rect(x, yy, w, rowH, "woodDark", { val: v, jitter: 0.06, seed: yy });
    p.hline(x, yy, w, "woodDark", { val: v * 0.45 });
    let jx = x + Math.floor(r() * 30);
    while (jx < x + w) {
      p.vline(jx, yy, rowH, "woodDark", { val: v * 0.5 });
      jx += 24 + Math.floor(r() * 30);
    }
    yy += rowH;
    rowH = Math.min(9, rowH + (r() < 0.6 ? 1 : 0));
  }
};

/** Round rug, seen at an angle. */
export const rug = (p: P, cx: number, cy: number, rx: number, ry: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      const band = d > 0.82 ? 0.75 : d > 0.62 && d < 0.7 ? 0.62 : 0.45;
      p.put(x, y, "book1", { val: band, jitter: 0.05, ny: -1 });
    }
};

/** Dark foreground silhouette leaves (near layer, out of focus). */
export const hangingLeaves = (p: P, x: number, y: number, len: number, seed = 13) => {
  const r = rng(seed);
  let vx = x;
  for (let k = 0; k < len; k++) {
    vx += (r() - 0.5) * 1.2;
    p.rect(vx, y + k, 1, 1, "leaf", { val: 0.22 });
    if (k % 5 === 2) {
      const s = 2.2 + r() * 2.2;
      const dir = r() < 0.5 ? -1 : 1;
      p.disc(vx + dir * s, y + k + 1, s, "leaf", { val: 0.18 + r() * 0.12 });
    }
  }
};
