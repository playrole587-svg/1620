// Procedural canvas textures. All drawing is seeded, so every render tab produces
// identical pixels.

import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { rng } from "../core/noise";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  return t;
};

const memo = <T,>(fn: () => T) => {
  let v: T | null = null;
  return () => (v ??= fn());
};

/** Soft round falloff, white → transparent (halos, ground pools). */
export const radialTex = memo(() => {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gr.addColorStop(0.6, "rgba(255,255,255,0.12)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
});

/** Long vertical smear for lamp reflections on wet asphalt. */
export const streakTex = memo(() => {
  const [c, g] = canvas(64, 256);
  const img = g.createImageData(64, 256);
  const r = rng(11);
  for (let y = 0; y < 256; y++) {
    const v = y / 255;
    const along = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 1.4) * (1 - v * 0.55);
    // broken by ripples: a few horizontal gaps
    const ripple = 0.75 + 0.25 * Math.sin(y * 0.9 + r() * 0.5) * Math.sin(y * 0.23);
    for (let x = 0; x < 64; x++) {
      const u = (x - 31.5) / 32;
      const a = Math.exp(-u * u * 7) * along * ripple;
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c);
});

/**
 * 2×2 atlas of lit interiors seen through a window, each 128² cell:
 *  (0,0) ceiling lamp + shelf  (0.5,0) half-drawn curtains
 *  (0,0.5) venetian blinds     (0.5,0.5) plant on the sill + table lamp
 * Brightness is baked as a soft gradient so a lit pane never reads as a flat card.
 */
export const interiorAtlas = memo(() => {
  const S = 128;
  const [c, g] = canvas(S * 2, S * 2);
  const base = (ox: number, oy: number, hot: number) => {
    const gr = g.createRadialGradient(ox + S * 0.5, oy + S * 0.18, 4, ox + S * 0.5, oy + S * 0.4, S * 0.9);
    gr.addColorStop(0, `rgba(255,236,200,1)`);
    gr.addColorStop(0.35, `rgba(${Math.round(230 * hot)},${Math.round(170 * hot)},${Math.round(110 * hot)},1)`);
    gr.addColorStop(1, "rgba(70,40,26,1)");
    g.fillStyle = gr;
    g.fillRect(ox, oy, S, S);
  };
  // Cell A: lamp + shelf silhouette
  base(0, 0, 1);
  g.fillStyle = "rgba(60,35,22,0.75)";
  g.fillRect(12, 70, 46, 8);
  g.fillRect(16, 52, 8, 18);
  g.fillRect(28, 56, 10, 14);
  g.fillRect(86, 88, 30, 40);
  // Cell B: curtains
  base(S, 0, 1.05);
  g.fillStyle = "rgba(120,52,38,0.9)";
  for (let i = 0; i < 4; i++) {
    g.fillRect(S + i * 8, 0, 7, S);
    g.fillRect(S * 2 - 8 - i * 8, 0, 7, S);
  }
  // Cell C: blinds
  base(0, S, 0.95);
  g.fillStyle = "rgba(80,50,30,0.55)";
  for (let y = 0; y < S; y += 11) g.fillRect(0, S + y, S, 4);
  // Cell D: plant + table lamp
  base(S, S, 1.0);
  g.fillStyle = "rgba(40,48,30,0.85)";
  const r = rng(5);
  for (let i = 0; i < 18; i++) g.fillRect(S + 10 + r() * 34, S + 64 + r() * 40, 9, 9);
  g.fillRect(S + 22, S + 100, 14, 28);
  g.fillStyle = "rgba(255,226,170,1)";
  g.fillRect(S + 88, S + 70, 18, 12);
  g.fillStyle = "rgba(60,35,22,0.8)";
  g.fillRect(S + 95, S + 82, 4, 26);
  g.fillRect(S + 70, S + 106, 54, 22);
  return tex(c);
});

export type Glyph = { text: string; color: string };

/** Sign with emissive lettering on a dark panel (café, cinema). */
export const signTex = (text: string, w: number, h: number, font: string, color = "#ffd59a") => {
  const [c, g] = canvas(w, h);
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  return tex(c);
};
