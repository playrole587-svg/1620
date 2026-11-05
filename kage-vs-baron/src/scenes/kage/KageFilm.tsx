// KUIL RETAK — "Kage vs Baron Besi". A fighting-game-styled pixel animation (not a game): 20 s, 9:16.
// Original cast, arena and logo. Every time below is a film frame on a 60 fps clock (`f`), so the 30 fps
// preview and the 60 fps final play identically; all motion is a pure function of the frame.
// Beats live in timeline.ts and are shared with the sound design.

import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../kits/pixelstory/core/palette.ts";
import { clamp, ease, keys, onTwos, ramp, type Ease } from "../../kits/pixelstory/core/motion.ts";
import { fbm1, hash } from "../../kits/pixelstory/core/noise.ts";
import { CinematicCamera, Layer, SCREEN } from "../../kits/pixelstory/camera/CinematicCamera.tsx";
import { cameraAt, drift } from "../../kits/pixelstory/camera/path.ts";
import { AlbedoView, SpriteView } from "../../kits/pixelstory/pixel/views.tsx";
import { Exposure, Glow, Grade, Grain, Vignette } from "../../kits/pixelstory/lighting/overlays.tsx";
import { spriteGainAt, spriteLightsAt } from "../../kits/pixelstory/lighting/spriteLight.ts";
import type { Light } from "../../kits/pixelstory/lighting/relight.ts";
import { useFonts } from "../../kits/pixelstory/typography/fonts.ts";
import { BARON, KAGE, POSES as G, P, drawChar, flashPal, poseAt, tintPal, type PKey, type Pose } from "./rig.ts";
import { BRAZIER_L, BRAZIER_R, GROUND_Y, MOON, MOON_ANCHOR, MOON_PAL, buildSet, moonSprite } from "./set.ts";
import { Embers, Flame, Fog, HitSpark, ShockRing, Slash, SmokePuff, FxCanvas, newBuf, setPx } from "./fx.tsx";
import { Banner, EyesInsert, Hud, KoCard, Logo, FightCard, RoundCard, WinLine, type Hp } from "./ui.tsx";
import { DURATION, HITS, T, s } from "./timeline.ts";

export const KAGE_FILM_SECONDS = DURATION;
const FILM_FPS = 60;

const k = (t: number, p: Pose, e?: Ease): PKey => ({ f: s(t), p, e });
const A = ease.arrive;

// ---------------------------------------------------------------- choreography
const KAGE_POSE: PKey[] = [
  k(0, G.guard), k(0.7, G.guard2), k(1.4, G.guard), k(2.0, G.guard2), k(2.45, G.guard),
  k(2.55, G.stepA), k(2.67, G.stepB), k(2.79, G.stepA), k(2.91, G.stepB), k(2.97, G.jabWind),
  k(3.03, G.jabExt, A), k(3.13, G.jabExt), k(3.25, G.crossWind),
  k(3.38, G.crossExt, A), k(3.5, G.crossExt), k(3.6, G.kickWind),
  k(3.75, G.kickExt, A), k(3.86, G.kickExt), k(3.98, G.guard2),
  k(4.06, G.kickWind), k(4.17, G.roundExt, A), k(4.34, G.roundExt), k(4.6, G.guard2),
  k(4.8, G.guard), k(4.88, G.hitB, A), k(5.0, G.flung, A), k(5.4, G.flung), k(5.48, G.slide), k(5.78, G.slide), k(6.0, G.kneel),
  k(6.5, P({ ...G.kneel, lean: 20, head: 26, hip: 12 })), k(7.0, G.kneel),
  // ultimate (faces left)
  k(7.7, G.crouch), k(7.8, G.crouch), k(8.0, G.leap, A), k(8.1, P({ ...G.leap, bl: 22, ba: 172 })), k(8.66, P({ ...G.leap, bl: 22, ba: 172, lean: 14 })),
  k(8.74, G.dive, A), k(9.16, G.dive),
  k(9.6, G.sheath), k(12.3, P({ ...G.sheath, sw: 2.4 })),
  k(12.9, P({ ...G.victory, bl: 0, uF: 40, fF: 140, uB: 20, fB: 150, lean: 6 }), ease.cameraSoft),
  k(13.5, G.victory, A), k(20, G.victory),
];
const KAGE_X: { f: number; v: number; e?: Ease }[] = [
  { f: 0, v: 40 }, { f: s(2.45), v: 40 }, { f: s(2.97), v: 62, e: ease.cameraSoft }, { f: s(3.5), v: 64 }, { f: s(4.8), v: 64 },
  { f: s(5.0), v: 52, e: A }, { f: s(5.42), v: 30, e: ease.arriveSoft }, { f: s(5.8), v: 24, e: ease.arriveSoft }, { f: s(7.6), v: 24 },
  { f: s(7.75), v: 90 }, { f: s(8.1), v: 92, e: ease.arriveSoft }, { f: s(8.7), v: 92 }, { f: s(9.15), v: 76, e: ease.smooth },
  { f: s(9.6), v: 34 }, { f: s(20), v: 34 },
];
const arcY = (f: number, a: number, b: number, h: number) => {
  const u = clamp((f - a) / (b - a));
  return -h * 4 * u * (1 - u);
};
const kageLift = (f: number) => {
  if (f >= s(4.95) && f < s(5.45)) return arcY(f, s(4.95), s(5.45), 22);
  if (f >= s(7.75) && f < s(9.2)) {
    return keys(f, [
      { f: s(7.75), v: 0 }, { f: s(8.08), v: -118, e: ease.arriveSoft }, { f: s(8.66), v: -124, e: ease.body },
      { f: s(9.15), v: -4, e: ease.departSoft },
    ]);
  }
  return 0;
};
const kageFlip = (f: number) => f >= s(7.7) && f < s(12.4);
const kageVisible = (f: number) => !(f >= s(T.vanish) && f < s(7.75)) && !(f >= s(9.17) && f < s(9.6));

const hitRec = (h: number, p: Pose, hold = 0.12) => [k(h - 0.02, G.guard2), k(h + 0.03, p, A), k(h + hold, p), k(h + hold + 0.16, G.guard)];
const BARON_POSE: PKey[] = [
  k(0, G.guard), k(0.8, G.guard2), k(1.6, G.guard), k(2.3, G.guard2), k(3.0, G.guard),
  ...hitRec(3.05, G.hitA), ...hitRec(3.4, G.hitA), ...hitRec(3.77, G.hitB, 0.14),
  k(4.17, G.guard2), k(4.22, G.hitB, A), k(4.36, G.hitB), k(4.6, G.baronWind), k(4.78, G.baronWind),
  k(4.88, G.baronSwing, A), k(5.02, G.baronSwing), k(5.35, G.guard),
  k(5.55, G.stepA), k(5.8, G.stepB), k(6.05, G.stepA), k(6.3, G.stepB), k(6.55, G.stepA), k(6.8, G.stepB),
  k(6.95, G.baronWind), k(7.08, G.baronWind), k(7.2, G.baronSlam, A), k(7.9, G.baronSlam),
  k(8.2, P({ ...G.guard, head: -10, lean: 2 })), k(8.8, P({ ...G.guard, head: 8, lean: 4 })),
  k(9.14, G.guard), k(9.18, G.hitB, A), k(9.76, G.hitB),
  k(9.9, G.flung), k(10.45, P({ ...G.flung, lean: -75, tF: 60, sF: 70, tB: 50, sB: 60, hip: 20 })), k(10.98, G.lying, ease.arriveSoft), k(20, G.lying),
];
const BARON_X: { f: number; v: number; e?: Ease }[] = [
  { f: 0, v: 98 }, { f: s(3.05), v: 98 }, { f: s(3.12), v: 99.5 }, { f: s(3.4), v: 99.5 }, { f: s(3.46), v: 101 }, { f: s(3.77), v: 101 },
  { f: s(3.83), v: 103.5 }, { f: s(4.19), v: 103.5 }, { f: s(4.27), v: 106 }, { f: s(4.5), v: 106 }, { f: s(4.86), v: 96, e: A },
  { f: s(5.55), v: 96 }, { f: s(7.1), v: 62, e: ease.linear }, { f: s(9.78), v: 62 }, { f: s(10.98), v: 112, e: ease.arriveSoft }, { f: s(20), v: 112 },
];
const baronLift = (f: number) => (f >= s(9.78) && f < s(10.98) ? arcY(f, s(9.78), s(10.98), 30) : 0);

// ---------------------------------------------------------------- HUD numbers
const series = (events: [number, number][], f: number, delay = 0, dur = 6) => {
  let v = 100;
  for (const [t, to] of events) {
    const a = s(t) + delay;
    const u = ramp(f, a, a + dur, ease.smooth);
    v = v + (to - v) * u;
  }
  return v;
};
const BARON_HP: [number, number][] = [[3.05, 90], [3.4, 80], [3.77, 66], [4.19, 48], [9.16, 30], [9.3, 20], [9.42, 8], [9.54, 0]];
const KAGE_HP: [number, number][] = [[4.88, 45]];
const hpOf = (ev: [number, number][], f: number): Hp => ({ hp: series(ev, f), lag: series(ev, f, s(0.5), 22) });

// ---------------------------------------------------------------- component
export const KageFilm: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f = (frame / fps) * FILM_FPS;
  const af = onTwos(f, 2); // animation clock: pixel art holds poses on twos
  const set = useMemo(buildSet, []);

  // ---- state of the fight
  const kPose = poseAt(af, KAGE_POSE);
  const bPose = poseAt(af, BARON_POSE);
  const kx = keys(f, KAGE_X);
  const bx = keys(f, BARON_X);
  const ky = GROUND_Y + kageLift(f);
  const by = GROUND_Y + baronLift(f);
  const flipK = kageFlip(f);
  const kVis = kageVisible(f);
  const baronDown = f >= s(T.thud);

  // flashes on the one hit frame pair
  const flashOf = (to: "baron" | "kage") => HITS.some((h) => h.to === to && f >= s(h.t) && f < s(h.t) + 3) || (to === "baron" && f >= s(T.strike) && f < s(T.strike) + 3);
  const kFlash = flashOf("kage");
  const bFlash = flashOf("baron");

  // ---- sprites (re-drawn per animation frame, never smoothed)
  const kSprite = useMemo(() => drawChar(KAGE, kPose, af), [JSON.stringify(kPose), Math.floor(af / 4)]);
  const bSprite = useMemo(() => drawChar(BARON, bPose, af), [JSON.stringify(bPose), Math.floor(af / 6)]);

  // ---- eclipse amount
  const eclipse = ramp(f, s(T.eclipseStart), s(T.eclipseFull), ease.cameraSoft) * (1 - ramp(f, s(T.eclipseEnd - 0.3), s(T.eclipseEnd + 1.3), ease.cameraSoft));
  const eclQ = Math.round(eclipse * 24) / 24;
  const moon = useMemo(() => moonSprite(eclQ), [eclQ]);

  // ---- lights
  const flick = (seed: number, speed = 8, amp = 0.14) => 1 + fbm1(f / speed, seed) * amp * 2;
  const moonI = (1 - eclipse * 0.9) * (1 + fbm1(f / 200, 2) * 0.05);
  const lights: (Light & { color?: string })[] = [
    { kind: "cone", x: MOON.x, y: MOON.y, r: 150, i: 1.0 * moonI, angle: 1.95, spread: 0.55, color: "#9DB8FF" },
    { kind: "point", x: 66, y: 218, r: 40, i: 0.55 * moonI, color: "#9DB8FF" },
    { kind: "point", x: BRAZIER_L.x, y: BRAZIER_L.y - 10, r: 46, i: 1.9 * flick(3), color: "#FFB05A" },
    { kind: "point", x: BRAZIER_R.x, y: BRAZIER_R.y - 10, r: 46, i: 1.9 * flick(8), color: "#FFB05A" },
  ];
  // impacts light the arena
  for (const h of HITS) {
    const a = f - s(h.t);
    if (a >= 0 && a < 12) lights.push({ kind: "point", x: h.x, y: h.y, r: 34, i: 3.2 * (1 - a / 12), color: h.kind === "heavy" ? "#FFD2A0" : "#FFF3D6" });
  }
  const ult = (a: number) => f - s(a);
  for (const a of [T.strike, ...T.slashes, T.shatter]) {
    const q = ult(a);
    if (q >= 0 && q < 14) lights.push({ kind: "point", x: bx, y: GROUND_Y - 40, r: 44, i: 4.2 * (1 - q / 14), color: "#FFE9D6" });
  }
  const ambient = 0.14 - eclipse * 0.07;
  const relightOpts = { ambient, exposure: 1.02, dither: 0.45 };
  const kLights = spriteLightsAt(lights, kx, ky - 22, { rim: 1.0, core: 0.22 });
  const bLights = spriteLightsAt(lights, bx, by - 24, { rim: 1.0, core: 0.22 });
  const kGain = spriteGainAt(lights, kx, ky - 22, ambient) + 0.12;
  const bGain = spriteGainAt(lights, bx, by - 24, ambient) + 0.12;

  // ---- camera
  const cam0 = cameraAt(f, [
    { f: 0, y: -300, z: -140, x: 0, focus: 1150, aperture: 5 },
    { f: s(1.9), y: 40, z: 10, x: -10, e: ease.cameraSoft },
    { f: s(2.9), y: 70, z: 25, x: 0, e: ease.body },
    { f: s(4.86), y: 112, z: 100, x: -20, e: ease.cameraSoft },
    { f: s(5.1), y: 112, z: 100, x: -90 },
    { f: s(5.8), y: 100, z: 80, x: -150, e: ease.cameraSoft },
    { f: s(7.0), y: 104, z: 120, x: -130, e: ease.cameraSoft },
    { f: s(7.35), y: 94, z: 40, x: -30, e: ease.cameraSoft },
    { f: s(7.7), y: 94, z: 30, x: -10, e: ease.body },
    { f: s(8.05), y: -430, z: 0, x: 60, e: ease.cameraSoft },
    { f: s(8.64), y: -440, z: 0, x: 60, e: ease.body },
    { f: s(9.0), y: 110, z: 70, x: 10, e: A },
    { f: s(9.5), y: 112, z: 120, x: -40, e: ease.cameraSoft },
    { f: s(10.0), y: 108, z: 90, x: 30, e: ease.cameraSoft },
    { f: s(11.05), y: 120, z: 90, x: 190, e: ease.cameraSoft },
    { f: s(12.0), y: 100, z: 110, x: 70, e: ease.cameraSoft },
    { f: s(13.2), y: 60, z: 140, x: -220, e: ease.cameraSoft },
    { f: s(15.4), y: 20, z: 90, x: -170, e: ease.body },
    { f: s(20), y: -60, z: -40, x: -80, e: ease.cameraSoft },
  ]);
  const d = drift(f, 5);
  // camera shake from impacts (stepped, decaying)
  const shakeEvents: [number, number][] = [
    ...HITS.map((h) => [h.t, h.shake] as [number, number]),
    [T.baronSlam, 24], [T.strike, 30], ...T.slashes.map((q) => [q, 12] as [number, number]), [T.shatter, 34], [T.thud, 26], [T.ko, 20],
  ];
  let shx = 0;
  let shy = 0;
  for (const [tt, amp] of shakeEvents) {
    const a = f - s(tt);
    if (a >= 0 && a < 16) {
      const sg = Math.floor(a / 2) % 2 ? 1 : -1;
      shx += sg * amp * (1 - a / 16);
      shy += -sg * amp * 0.45 * (1 - a / 16);
    }
  }
  const cam = { ...cam0, x: cam0.x + d.x + Math.round(shx / 4) * 4, y: cam0.y + d.y + Math.round(shy / 4) * 4, roll: d.roll };

  // ---- HUD values
  const hpK = hpOf(KAGE_HP, f);
  const hpB = hpOf(BARON_HP, f);
  const timer = 99 - Math.floor(Math.max(0, Math.min(f, s(T.baronSlam)) - s(T.fightGone)) / s(0.32));
  const hudOpacity = ramp(f, s(1.0), s(1.5)) * (1 - ramp(f, s(T.logo - 0.3), s(T.logo + 0.3)));

  const kHeadX = kx + (flipK ? -1 : 1) * 4;
  const kHeadY = ky - 38;
  const u = width / SCREEN.w;
  const slashDefs = [
    { t: T.slashes[0], x0: bx - 34, y0: 140, x1: bx + 36, y1: 190 },
    { t: T.slashes[1], x0: bx + 34, y0: 146, x1: bx - 36, y1: 186 },
    { t: T.slashes[2], x0: bx - 4, y0: 122, x1: bx + 6, y1: 198 },
  ];

  // shadows under the fighters (shrink when airborne)
  const shadow = (x: number, h: number, w: number) => {
    const sc = clamp(1 - h / 150, 0.3, 1);
    const b = newBuf(40, 8);
    for (let yy = 0; yy < 8; yy++)
      for (let xx = 0; xx < 40; xx++) {
        const e = ((xx - 19.5) / (w * sc)) ** 2 + ((yy - 3.5) / (3.4 * sc)) ** 2;
        if (e <= 1) setPx(b, xx, yy, "#05060C", e > 0.55 ? 110 : 170);
      }
    return <FxCanvas buf={b} ox={x - 20} oy={GROUND_Y - 2} />;
  };

  return (
    <AbsoluteFill style={{ background: "#05060C", overflow: "hidden" }}>
      {withAudio ? <Audio src={staticFile("audio/mix.wav")} /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: SCREEN.w, height: SCREEN.h, transform: `scale(${u})`, transformOrigin: "0 0" }}>
        <CinematicCamera cam={cam}>
          {/* sky and moon */}
          <Layer z={2600} maxBlur={3}>
            <AlbedoView albedo={set.sky} lights={[]} opts={{ ambient: 1, exposure: 1, dither: 0.5 }} />
            <Glow x={MOON.x} y={MOON.y} r={44} color="#9DB8FF" intensity={0.5 * (1 - eclipse * 0.8)} />
            <Glow x={MOON.x} y={MOON.y} r={30} color="#C0303A" intensity={0.65 * Math.max(0, eclipse - 0.5) * 2} />
            <SpriteView sprite={moon} pal={MOON_PAL} anchor={MOON_ANCHOR} x={MOON.x} y={MOON.y} />
          </Layer>
          {/* far temple in haze */}
          <Layer z={2000} haze={2} maxBlur={5}>
            <AlbedoView albedo={set.far} lights={[]} opts={{ ambient: 1, exposure: 0.85 - eclipse * 0.25, dither: 0.5 }} />
            <Fog frame={f} y={118} h={46} speed={0.02} density={0.8} seed={4} color="#6F83AC" />
          </Layer>
          {/* ruined hall wall */}
          <Layer z={1450} maxBlur={7}>
            <AlbedoView albedo={set.mid} lights={lights} opts={relightOpts} />
            <Glow x={100} y={108} r={14} color="#FFB05A" intensity={0.55 * flick(21, 9)} />
            <Glow x={130} y={108} r={14} color="#FFB05A" intensity={0.55 * flick(22, 9)} />
          </Layer>
          {/* floor and fighters */}
          <Layer z={1150} maxBlur={8}>
            <AlbedoView albedo={set.ground} lights={lights} opts={relightOpts} />
            <Fog frame={f} y={176} h={34} speed={0.05} density={0.7} seed={9} color="#9DB1D4" />
            <Glow x={BRAZIER_L.x} y={BRAZIER_L.y - 10} r={22} color="#FFB05A" intensity={0.5 * flick(3)} />
            <Glow x={BRAZIER_R.x} y={BRAZIER_R.y - 10} r={22} color="#FFB05A" intensity={0.5 * flick(8)} />
            <Flame x={BRAZIER_L.x} y={BRAZIER_L.y - 7} frame={f} />
            <Flame x={BRAZIER_R.x} y={BRAZIER_R.y - 7} frame={f + 17} />
            <Embers x={BRAZIER_L.x} y={BRAZIER_L.y - 10} frame={f} seed={1} />
            <Embers x={BRAZIER_R.x} y={BRAZIER_R.y - 10} frame={f} seed={2} />
            {shadow(bx, by - GROUND_Y, 15)}
            {kVis ? shadow(kx, ky - GROUND_Y, 13) : null}
            {/* Baron (faces left: flipped) */}
            <SpriteView
              sprite={bSprite}
              pal={bFlash ? flashPal(BARON.pal) : baronDown ? { ...BARON.pal, e: "#2B2018" } : BARON.pal}
              anchor={BARON.anchor}
              x={bx}
              y={by}
              flip
              lights={bFlash ? [] : bLights.map((l) => ({ ...l, dir: [-l.dir[0], l.dir[1]] as [number, number] }))}
              gain={bFlash ? 1 : bGain}
            />
            {/* Kage */}
            {kVis ? (
              <SpriteView
                sprite={kSprite}
                pal={kFlash ? flashPal(KAGE.pal) : KAGE.pal}
                anchor={KAGE.anchor}
                x={kx}
                y={ky}
                flip={flipK}
                lights={kFlash ? [] : flipK ? kLights.map((l) => ({ ...l, dir: [-l.dir[0], l.dir[1]] as [number, number] })) : kLights}
                gain={kFlash ? 1 : kGain}
              />
            ) : null}
            {/* Kage's eyes glow, and his crimson aura in the ultimate */}
            {kVis && f > s(T.eclipseStart) && f < s(T.strike + 0.05) ? <Glow x={kHeadX} y={kHeadY + (ky - GROUND_Y)} r={14} color="#FF4A3D" intensity={0.8 * Math.max(0.3, eclipse)} /> : null}
            {kVis && f > s(T.eclipseStart) && f < s(T.strike + 0.05) && ky < GROUND_Y - 20 ? <Glow x={kx} y={ky - 26} r={40} color="#FF5A44" intensity={0.8} /> : null}
            {/* dive trail */}
            {f >= s(8.74) && f < s(9.22)
              ? [1, 2, 3, 4, 5, 6].map((i) => {
                  const ff = f - i * 3;
                  const gx = keys(ff, KAGE_X);
                  const gy = GROUND_Y + kageLift(ff);
                  return <SpriteView key={i} sprite={kSprite} pal={tintPal(KAGE.pal, i % 2 ? "#7A1520" : "#C8262E")} anchor={KAGE.anchor} x={gx} y={gy} flip opacity={0.5 - i * 0.07} />;
                })
              : null}
            {/* hit sparks */}
            {HITS.map((h, i) => (
              <HitSpark key={i} x={h.x} y={h.y} age={f - s(h.t)} size={h.size} tone={h.to === "kage" ? "red" : "warm"} />
            ))}
            <HitSpark x={bx} y={166} age={f - s(T.strike)} size={20} tone="red" />
            {slashDefs.map((sd, i) => (
              <React.Fragment key={i}>
                <Slash x0={sd.x0} y0={sd.y0} x1={sd.x1} y1={sd.y1} age={f - s(sd.t)} />
                <HitSpark x={bx + (i - 1) * 6} y={165 + i * 3} age={f - s(sd.t) - 2} size={12 + i * 2} tone="red" />
              </React.Fragment>
            ))}
            <HitSpark x={bx} y={160} age={f - s(T.shatter)} size={26} tone="warm" />
            {/* armour flies apart */}
            {f >= s(T.shatter) && f < s(T.shatter) + 60
              ? Array.from({ length: 26 }, (_, i) => {
                  const a = f - s(T.shatter);
                  const vx = (hash(i * 3 + 1) - 0.25) * 1.5;
                  const vy = -0.6 - hash(i * 5 + 2) * 1.2;
                  const px = bx + vx * a * 1.2 + (hash(i) - 0.5) * 10;
                  const py = 150 + vy * a + 0.04 * a * a + hash(i * 7) * 14;
                  const col = i % 4 === 0 ? "#E8BC62" : i % 3 === 0 ? "#B8C3D4" : "#7D8899";
                  return <div key={i} style={{ position: "absolute", left: Math.round(px) * 8, top: Math.round(py) * 8, width: (i % 5 === 0 ? 3 : 2) * 8, height: (i % 4 === 0 ? 3 : 2) * 8, background: col, opacity: 1 - a / 60 }} />;
                })
              : null}
            {/* smoke where Kage vanishes and where the ground is struck */}
            <SmokePuff x={kx} y={GROUND_Y - 14} age={f - s(T.vanish)} r={16} seed={2} />
            <ShockRing x={bx - 22} y={GROUND_Y} age={f - s(T.baronSlam)} r={34} />
            <ShockRing x={kx + 10} y={GROUND_Y} age={f - s(5.47)} r={18} />
            <SmokePuff x={kx} y={GROUND_Y - 4} age={f - s(5.47)} r={10} seed={5} />
            <ShockRing x={bx} y={GROUND_Y} age={f - s(T.thud)} r={40} />
            <SmokePuff x={bx} y={GROUND_Y - 6} age={f - s(T.thud)} r={18} seed={8} />
            <SmokePuff x={34} y={GROUND_Y - 6} age={f - s(T.sheath)} r={12} seed={11} />
            <Fog frame={f + 90} y={196} h={30} speed={0.07} density={0.45} seed={12} color="#B7C6E2" />
          </Layer>
          {/* foreground: dark columns, out of focus */}
          <Layer z={650} maxBlur={14}>
            <AlbedoView albedo={set.fg} lights={lights} opts={{ ambient: 0.1, exposure: 1, dither: 0.4 }} />
            <AlbedoView albedo={set.fgR} lights={lights} opts={{ ambient: 0.1, exposure: 1, dither: 0.4 }} />
          </Layer>
        </CinematicCamera>

        {/* grade: eclipse pulls the whole frame toward wine-black */}
        <AbsoluteFill style={{ background: "#2A0A18", mixBlendMode: "multiply", opacity: 0.32 * eclipse, pointerEvents: "none" }} />
        <AbsoluteFill style={{ background: "#C8262E", mixBlendMode: "soft-light", opacity: 0.28 * eclipse, pointerEvents: "none" }} />
        <Grade />
        <Vignette strength={0.8 + eclipse * 0.2} />
        <Grain frame={Math.floor(f)} />

        <Hud f={f} kage={hpK} baron={hpB} timer={timer} kagePip={f >= s(T.koEnd)} opacity={hudOpacity} />
        <RoundCard f={f} start={s(T.roundText)} end={s(1.55)} />
        <FightCard f={f} start={s(T.fightText)} end={s(T.fightGone)} />
        <EyesInsert f={f} start={s(T.eyesIn)} end={s(T.eyesOut)} />
        <Banner f={f} start={s(T.banner)} end={s(8.55)} />
        <KoCard f={f} start={s(T.ko)} end={s(T.koEnd)} />
        <WinLine f={f} start={s(T.wins)} end={s(T.logo + 0.2)} />
        <Logo f={f} start={s(T.logo)} end={s(DURATION)} />
        <Exposure color={C.ink} amount={(1 - ramp(f, 0, 40, ease.arriveSoft)) + ramp(f, s(T.fadeOut), s(DURATION), ease.cameraSoft)} />
      </div>
    </AbsoluteFill>
  );
};
