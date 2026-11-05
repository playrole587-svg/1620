// Screen-space layer: HUD, round / fight / K.O. cards, ultimate banner, the eye close-up insert, win line
// and the end logo. Laid out on the 1080 × 1920 stage (like the rest of the kit) and scaled by the film.

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { clamp, ease, ramp } from "../../kits/pixelstory/core/motion.ts";
import { hash, hash2 } from "../../kits/pixelstory/core/noise.ts";
import { bayer } from "../../kits/pixelstory/core/noise.ts";
import { FONT } from "../../kits/pixelstory/typography/fonts.ts";
import { PixelCanvas } from "../../kits/pixelstory/pixel/PixelCanvas.tsx";
import { PX } from "../../kits/pixelstory/pixel/views.tsx";
import { newBuf, setPx, discB, lineB, type Buf } from "./fx.tsx";
import { s } from "./timeline.ts";

const INK = "#0D0809";
const IVORY = "#F3E6CC";
const GOLD = "#F4B860";

const stack = (color: string[], step = 8) => color.map((c, i) => `${(i + 1) * step}px ${(i + 1) * step}px 0 ${c}`).join(", ");

// ---------- HUD ----------
export type Hp = { hp: number; lag: number };

const Bar: React.FC<{ side: "L" | "R"; hp: Hp; name: string; pip: boolean; pulse: number }> = ({ side, hp, name, pip, pulse }) => {
  const W = 436;
  const left = side === "L";
  const low = hp.hp < 30;
  const fillColor = low ? `linear-gradient(#FF8A7A, #E03A44 45%, #8B1E2B)` : `linear-gradient(#FFE9B0, #F4B860 40%, #C2501F)`;
  return (
    <div style={{ position: "absolute", top: 292, [left ? "left" : "right"]: 52, width: W, textAlign: left ? "left" : "right" }}>
      <div style={{ fontFamily: FONT.pixel, fontWeight: 700, fontSize: 36, letterSpacing: "0.12em", color: IVORY, textShadow: `4px 4px 0 ${INK}`, marginBottom: 8 }}>{name}</div>
      <div style={{ position: "relative", width: W, height: 40, border: `6px solid ${INK}`, background: "#3D141D", boxShadow: `0 0 0 4px #6B1F2D, 8px 8px 0 4px ${INK}`, clipPath: undefined }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, [left ? "right" : "left"]: 0, width: `${hp.lag}%`, background: "#FFF3D6" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, [left ? "right" : "left"]: 0, width: `${hp.hp}%`, background: fillColor, filter: low ? `brightness(${1 + pulse * 0.35})` : undefined }} />
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, rgba(13,8,9,0) 0, rgba(13,8,9,0) 22px, rgba(13,8,9,0.5) 22px, rgba(13,8,9,0.5) 26px)" }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: left ? "flex-start" : "flex-end" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ width: 22, height: 22, border: `4px solid ${INK}`, background: i === 0 && pip ? GOLD : "#3D141D", boxShadow: `0 0 0 3px #6B1F2D` }} />
        ))}
      </div>
    </div>
  );
};

export const Hud: React.FC<{ f: number; kage: Hp; baron: Hp; timer: number; kagePip: boolean; opacity: number }> = ({ f, kage, baron, timer, kagePip, opacity }) => (
  <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
    <Bar side="L" hp={kage} name="KAGE" pip={kagePip} pulse={Math.sin(f * 0.25) * 0.5 + 0.5} />
    <Bar side="R" hp={baron} name="BARON BESI" pip={false} pulse={Math.sin(f * 0.25) * 0.5 + 0.5} />
    <div style={{ position: "absolute", top: 304, left: 480, width: 120, height: 88, background: INK, border: `6px solid #6B1F2D`, boxShadow: `8px 8px 0 ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT.pixel, fontWeight: 700, fontSize: 66, color: timer <= 10 ? "#FF8A7A" : IVORY, letterSpacing: "0.04em" }}>{String(Math.max(0, timer)).padStart(2, "0")}</div>
    </div>
  </AbsoluteFill>
);

// ---------- cards ----------
export const RoundCard: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end + 20) return null;
  const pin = ramp(f, start, start + 9, ease.arrive);
  const pout = ramp(f, end, end + 18, ease.departSoft);
  const sc = 1 + (1 - pin) * 0.8;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: (1 - pout) * clamp(pin * 2) }}>
      <div style={{ transform: `translateY(${-pout * 120 - 60}px) scale(${Math.round(sc * 20) / 20})`, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.pixel, fontWeight: 700, fontSize: 56, color: GOLD, letterSpacing: "0.5em", marginRight: "-0.5em", textShadow: `6px 6px 0 ${INK}` }}>- PUTARAN -</div>
        <div style={{ fontFamily: FONT.display, fontSize: 250, color: IVORY, lineHeight: 1, letterSpacing: "0.06em", marginTop: 6, textShadow: stack(["#9A2F35", "#6B1F2D", "#3D141D", INK], 8) }}>ROUND 1</div>
      </div>
    </AbsoluteFill>
  );
};

export const FightCard: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end + 20) return null;
  const pin = ramp(f, start, start + 5, ease.arrive);
  const pout = ramp(f, end, end + 14, ease.departSoft);
  const sc = 1 + (1 - pin) * 2.2 + pout * 0.5;
  const shake = f - start < 24 ? (Math.floor((f - start) / 2) % 2 ? 1 : -1) * Math.max(0, 14 - (f - start) * 0.6) : 0;
  const bar = ramp(f, start + 2, start + 14, ease.arrive);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: (1 - pout) * clamp(pin * 3) }}>
      <div style={{ position: "absolute", top: 882, left: 0, width: 1080 * bar, height: 12, background: "#9A2F35", boxShadow: `0 -8px 0 ${INK}, 0 8px 0 ${INK}` }} />
      <div style={{ transform: `translate(${Math.round(shake / 4) * 4}px, ${-pout * 80 - 40}px) scale(${Math.round(sc * 25) / 25})`, fontFamily: FONT.display, fontSize: 330, lineHeight: 1, letterSpacing: "0.04em", color: GOLD, textShadow: stack(["#C2501F", "#9A2F35", "#6B1F2D", "#3D141D", INK], 8) }}>
        FIGHT!
      </div>
    </AbsoluteFill>
  );
};

export const KoCard: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end + 16) return null;
  const pin = ramp(f, start, start + 6, ease.arrive);
  const pout = ramp(f, end, end + 14, ease.departSoft);
  const sc = 1 + (1 - pin) * 1.9 + ramp(f, start + 10, end, ease.linear) * 0.07;
  const age = f - start;
  const shake = age < 32 ? (Math.floor(age / 2) % 2 ? 1 : -1) * Math.max(0, 24 - age * 0.8) : 0;
  const flash = age < 5 ? 0.38 * (1 - age / 5) : 0;
  return (
    <>
      <AbsoluteFill style={{ background: "#FFF3D6", opacity: flash, pointerEvents: "none" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: (1 - pout) * clamp(pin * 3) }}>
        <div style={{ transform: `translate(${Math.round(shake / 4) * 4}px, ${Math.round((shake * 0.5) / 4) * 4 - 250}px) scale(${Math.round(sc * 25) / 25})`, fontFamily: FONT.display, fontSize: 470, lineHeight: 0.9, letterSpacing: "0.02em", color: "#E8483F", textShadow: stack(["#9A2F35", "#6B1F2D", "#3D141D", INK], 12) }}>
          K.O.
        </div>
      </AbsoluteFill>
    </>
  );
};

export const WinLine: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end) return null;
  const k = ramp(f, start, start + 22, ease.arrive);
  const out = ramp(f, end - 20, end, ease.departSoft);
  const chars = "KAGE MENANG";
  const n = Math.floor(clamp((f - start) / 3, 0, chars.length));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 1160, opacity: 1 - out }}>
      <div style={{ overflow: "hidden", padding: "6px 24px 14px" }}>
        <div style={{ transform: `translateY(${(1 - k) * 110}%)`, fontFamily: FONT.display, fontSize: 150, lineHeight: 1, color: IVORY, letterSpacing: "0.05em", textShadow: stack(["#9A2F35", "#3D141D", INK], 6), whiteSpace: "pre" }}>{chars.slice(0, Math.max(n, k > 0.6 ? chars.length : n))}</div>
      </div>
      <div style={{ fontFamily: FONT.pixel, fontWeight: 700, fontSize: 40, color: GOLD, letterSpacing: "0.3em", marginTop: 10, opacity: ramp(f, start + 18, start + 34), textShadow: `4px 4px 0 ${INK}` }}>PUTARAN 1 · MENANG</div>
    </AbsoluteFill>
  );
};

export const Banner: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end + 12) return null;
  const k = ramp(f, start, start + 12, ease.arrive);
  const out = ramp(f, end, end + 12, ease.departSoft);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: "absolute", top: 1330, left: 0, width: 1080 * k, height: 190, overflow: "hidden", transform: "skewX(-12deg) translateX(-30px)", background: "linear-gradient(90deg, rgba(13,8,9,0.0), rgba(13,8,9,0.78) 12%, rgba(13,8,9,0.78) 88%, rgba(13,8,9,0))", borderTop: "8px solid #9A2F35", borderBottom: "8px solid #9A2F35" }} />
      <div style={{ position: "absolute", top: 1322, left: 60, width: 980, clipPath: `inset(0 ${100 - k * 100}% 0 0)` }}>
        <div style={{ fontFamily: FONT.pixel, fontWeight: 700, fontSize: 36, color: GOLD, letterSpacing: "0.34em", textShadow: `4px 4px 0 ${INK}` }}>JURUS PAMUNGKAS</div>
        <div style={{ fontFamily: FONT.display, fontSize: 112, lineHeight: 1.1, color: IVORY, letterSpacing: "0.04em", textShadow: stack(["#C8262E", "#7A1520", INK], 6), whiteSpace: "pre" }}>GERHANA BAYANGAN</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- end logo ----------
export const Logo: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start) return null;
  const k = ramp(f, start, start + 30, ease.arriveSoft);
  const k2 = ramp(f, start + 18, start + 44, ease.arriveSoft);
  const out = ramp(f, end - 24, end, ease.departSoft);
  const steps = Math.round(k * 12) / 12;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <AbsoluteFill style={{ background: INK, opacity: ramp(f, start - 6, start + 24) * 0.55 }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 330 }}>
        <div style={{ opacity: steps, transform: `translateY(${(1 - steps) * 40}px)`, textAlign: "center" }}>
          <div style={{ width: 520, height: 14, margin: "0 auto 40px", background: "#C8262E", boxShadow: `0 0 0 6px ${INK}`, transform: "skewX(-30deg)" }} />
          <div style={{ fontFamily: FONT.display, fontSize: 240, lineHeight: 0.92, color: IVORY, letterSpacing: "0.04em", textShadow: stack(["#9A2F35", "#6B1F2D", "#3D141D", INK], 8) }}>KUIL</div>
          <div style={{ fontFamily: FONT.display, fontSize: 240, lineHeight: 0.92, color: IVORY, letterSpacing: "0.04em", textShadow: stack(["#9A2F35", "#6B1F2D", "#3D141D", INK], 8) }}>RETAK</div>
          <div style={{ marginTop: 52, opacity: k2, fontFamily: FONT.pixel, fontWeight: 700, fontSize: 40, color: GOLD, letterSpacing: "0.28em", marginRight: "-0.28em", textShadow: `4px 4px 0 ${INK}` }}>KAGE  VS  BARON BESI</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- eye close-up insert ----------
const eyesBuf = (age: number, open: number, flash: number): Buf => {
  const W = 135;
  const H = 90;
  const b = newBuf(W, H);
  const cx = 67;
  const cy = 52;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = y / H;
      const d = Math.hypot((x - cx) / 80, (y - cy) / 60);
      const glow = Math.max(0, 1 - d) * (0.35 + flash * 0.5);
      let hex = t < 0.5 ? "#0B1022" : "#12091A";
      if (glow > 0.12 + bayer(x, y) * 0.3) hex = "#3A0F1E";
      if (glow > 0.42 + bayer(x, y) * 0.3) hex = "#5E1626";
      setPx(b, x, y, hex);
    }
  // hood
  const RX = 56;
  const RY = 50;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const e = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2;
      if (e > 1) continue;
      const lit = (x - cx) / RX + (y - cy) / RY;
      let hex = "#1A2446";
      if (lit < -0.95) hex = "#324676";
      else if (lit < -0.55) hex = "#26355E";
      else if (lit > 0.8) hex = "#0F1730";
      if (e > 0.9) hex = "#080D1C";
      setPx(b, x, y, hex);
    }
  // lower-face cloth with folds
  for (let y = 62; y < H; y++)
    for (let x = 0; x < W; x++) {
      const e = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2;
      if (e > 0.9) continue;
      const fold = (x + y * 0.6) % 14 < 2;
      setPx(b, x, y, fold ? "#131C38" : "#222F58");
    }
  // eye slit (dark skin band)
  for (let y = 36; y <= 60; y++)
    for (let x = 20; x <= 114; x++) {
      const e = ((x - cx) / 48) ** 2 + ((y - 48) / 12.5) ** 2;
      if (e <= 1) setPx(b, x, y, y > 56 ? "#141B30" : "#0A1020");
    }
  // headband (crimson) with a trailing knot
  for (let y = 21; y <= 30; y++)
    for (let x = 14; x <= 120; x++) {
      const e = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2;
      if (e > 0.97) continue;
      setPx(b, x, y, y === 21 ? "#F0584A" : y >= 29 ? "#7A1520" : "#C8262E");
    }
  discB(b, 15, 27, 5, "#C8262E");
  for (let i = 0; i < 3; i++) {
    const sw = Math.sin(age * 0.2 + i) * 3;
    lineB(b, 12, 25 + i * 3, -4 - i * 6, 18 + i * 8 + sw, 1.8, 0.8, i === 1 ? "#F0584A" : "#C8262E");
  }
  // eyes: almond shapes slanted toward the nose; `open` 0..1, `flash` adds white-hot core
  const eye = (ex: number, dir: 1 | -1) => {
    for (let dx = -15; dx <= 15; dx++) {
      const hh = 6.2 * Math.sqrt(Math.max(0, 1 - (dx / 15.5) ** 2)) * Math.max(0.12, open);
      const tilt = dx * 0.24 * dir;
      for (let dy = -Math.ceil(hh); dy <= Math.ceil(hh); dy++) {
        const ay = Math.abs(dy);
        const core = ay <= hh * 0.45 && Math.abs(dx) < 11;
        const hex = flash > 0.6 && core ? "#FFF3D6" : core ? "#FFB08A" : ay <= hh * 0.75 ? "#FF5A44" : "#C8262E";
        setPx(b, ex + dx, 48 + dy + tilt, hex);
      }
    }
    // slit pupil
    if (open > 0.5) for (let dy = -3; dy <= 3; dy++) setPx(b, ex + 1 * dir, 48 + dy + 1, "#2A0A10");
    // brow
    lineB(b, ex - 17 * dir, 38 - 4 * dir * -1 + (dir === 1 ? 2 : 0), ex + 17 * dir, 38 + 1 + (dir === 1 ? -2 : 2), 1.6, 1.6, "#070B18");
  };
  eye(47, 1);
  eye(88, -1);
  return b;
};

export const EyesInsert: React.FC<{ f: number; start: number; end: number }> = ({ f, start, end }) => {
  if (f < start || f > end + 12) return null;
  const age = f - start;
  const openT = ramp(f, start + 14, start + 24, ease.arrive);
  const flash = ramp(f, start + 22, start + 26) * (1 - ramp(f, start + 34, start + 52));
  const buf = useMemo(() => eyesBuf(Math.floor(age / 2) * 2, openT, flash), [Math.floor(age / 2), Math.round(openT * 8), Math.round(flash * 4)]);
  const wipeIn = ramp(f, start, start + 8, ease.arriveSoft);
  const wipeOut = ramp(f, end, end + 10, ease.departSoft);
  const h = Math.round((wipeIn * (1 - wipeOut) * 90) / 2) * 2; // art rows visible
  const top = 600 + ((90 - h) / 2) * PX;
  const zoom = 1 + ramp(f, start, end, ease.linear) * 0.06;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, width: 1080, top, height: h * PX, overflow: "hidden", borderTop: `${h > 4 ? 8 : 0}px solid ${INK}`, borderBottom: `${h > 4 ? 8 : 0}px solid ${INK}` }}>
        <div style={{ position: "absolute", left: 0, top: -((90 - h) / 2) * PX, width: 1080, height: 90 * PX, transform: `scale(${zoom})`, transformOrigin: "50% 55%" }}>
          <PixelCanvas w={135} h={90} pixels={buf.d} scale={PX} />
          {/* drifting mist over the shot */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: ((f * (0.6 + i * 0.25) + i * 260) % 1400) - 200, top: 80 + i * 140, width: 360, height: 24, background: "rgba(157,177,212,0.16)" }} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Unused helper kept for symmetry with other kits' stage code. */
export const _hash = { hash, hash2, s };
