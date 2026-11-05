// PIXELSTORY technical example — a moonlit room, 8 s at any fps.
// A set painted once into albedo layers and relit every frame by two lights (moonlight cone through the
// window, a lantern that switches on), a cat sprite that receives the same light as it walks in and sits,
// dust in the moon shaft, a dolly with depth of field across layers, one line of pixel type.
// It is a technical check and a starting point, not a story: never reuse it as a buyer's film.
//
// Every time below is a film frame on a 60 fps clock (`f`), so the preview (30 fps) and the final
// (60 fps) play identically. The set is authored on a 1080 × 1920 stage (8 screen px per art px) and
// scaled to the render size.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../core/palette.ts";
import { ease, keys, ramp } from "../core/motion.ts";
import { fbm1 } from "../core/noise.ts";
import { CinematicCamera, Layer, SCREEN } from "../camera/CinematicCamera.tsx";
import { cameraAt, drift } from "../camera/path.ts";
import { createAlbedo, painter } from "../environment/albedo.ts";
import { beam, books, floor, hangingLeaves, nightWindow, plankWall, pothos, rug, shelf } from "../environment/props.ts";
import { AlbedoView, SpriteView } from "../pixel/views.tsx";
import { DustMotes } from "../particles/particles.tsx";
import { Exposure, Glow, Grade, Grain, LightShaft, Vignette } from "../lighting/overlays.tsx";
import { spriteGainAt, spriteLightsAt } from "../lighting/spriteLight.ts";
import type { Light } from "../lighting/relight.ts";
import { PixelType } from "../typography/Type.tsx";
import { useFonts } from "../typography/fonts.ts";
import { CAT_ANCHOR, CAT_PAL, catAt } from "./cat.ts";

export const PIXELSTORY_EXAMPLE_SECONDS = 8;
const FILM_FPS = 60;

/** Floor line (art px) and the window / lantern positions shared by paint, lights and overlays. */
const FLOOR_Y = 196;
const WIN = { x: 72, y: 44, w: 42, h: 58 };
const MOON = { x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h * 0.5, angle: 1.85, spread: 0.3 };
const MOON_POOL = { x: 54, y: 207 };
const LANTERN = { x: 22, y: 186 };

const buildSet = () => {
  // back wall layer: boards, beam, window, shelf with books
  const back = createAlbedo(167, 220, -16, -20);
  const b = painter(back);
  plankWall(b, -16, -20, 167, FLOOR_Y + 20, { seed: 21, base: 0.46 });
  beam(b, -16, 8, 167, 10, 8);
  nightWindow(b, WIN.x, WIN.y, WIN.w, WIN.h, 4);
  shelf(b, 8, 122, 44);
  books(b, 10, 122, 40, 6, ["jar", "lean"]);
  b.shade(-16, FLOOR_Y - 6, 167, 6, 0.6); // contact shadow where wall meets floor

  // floor layer: boards, rug, lantern, plant
  const front = createAlbedo(167, 90, -16, FLOOR_Y - 30);
  const p = painter(front);
  floor(p, -16, FLOOR_Y, 167, 50, 12);
  rug(p, 70, 214, 40, 7);
  // lantern: metal cap and base, amber glass
  p.rect(LANTERN.x - 5, FLOOR_Y - 2, 11, 2, "metal", { val: 0.5 });
  p.rect(LANTERN.x - 4, LANTERN.y - 6, 9, 14, "amberLamp", { val: 0.55, emit: 0.06 });
  for (const dx of [-4, 0, 4]) p.vline(LANTERN.x + dx, LANTERN.y - 6, 14, "metal", { val: 0.45 });
  p.poly([[LANTERN.x - 6, LANTERN.y - 6], [LANTERN.x + 6, LANTERN.y - 6], [LANTERN.x + 3, LANTERN.y - 10], [LANTERN.x - 3, LANTERN.y - 10]], "metal", { val: 0.6 });
  p.ring(LANTERN.x, LANTERN.y - 12, 2, "metal", { val: 0.7 });
  pothos(p, 106, FLOOR_Y + 2, 5, 10);

  // near layer: a dark trailing plant hanging into frame (out of focus)
  const near = createAlbedo(60, 90, -20, -10);
  hangingLeaves(painter(near), 4, -10, 70, 17);
  hangingLeaves(painter(near), 14, -10, 48, 23);
  return { back, front, near };
};

export const PixelstoryExample: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f = (frame / fps) * FILM_FPS;
  const set = useMemo(buildSet, []);

  // lights: moonlight breathes slightly; the lantern switches on at 4 s and flickers softly
  const lanternOn = ramp(f, 240, 300, ease.arriveSoft);
  const flicker = 1 + fbm1(f / 9, 4) * 0.12;
  const lights: (Light & { color?: string })[] = [
    { kind: "cone", x: MOON.x, y: MOON.y, r: 140, i: 1.0 + fbm1(f / 200, 2) * 0.05, angle: MOON.angle, spread: MOON.spread, color: "#CFE0FF" },
    // the pool the window throws on the floor (a cone alone fades out before it reaches the boards)
    { kind: "point", x: MOON_POOL.x, y: MOON_POOL.y, r: 30, i: 0.85, color: "#CFE0FF" },
    { kind: "point", x: LANTERN.x, y: LANTERN.y, r: 34, i: 2.1 * lanternOn * flicker, color: "#FFC46B" },
  ];
  const ambient = 0.14;
  const relightOpts = { ambient, exposure: 1.15, dither: 0.45 };

  // cat: walks in from the left, stops, sits and looks toward the window
  const catX = keys(f, [{ f: 30, v: -14 }, { f: 300, v: 60, e: ease.cameraSoft }]);
  const catState = f < 300 ? "walk" : f < 336 ? "stand" : "sit";
  const catY = FLOOR_Y + 6;

  // camera: slow dolly toward the cat with a gentle pan; focus on the floor layer
  const cam = cameraAt(f, [
    { f: 0, z: 0, x: 0, y: 30, focus: 1150, aperture: 7 },
    { f: 480, z: 170, x: -10, y: 150, e: ease.camera },
  ]);
  const d = drift(f, 5);

  const k = width / SCREEN.w;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: SCREEN.w, height: SCREEN.h, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <CinematicCamera cam={{ ...cam, x: cam.x + d.x, y: cam.y + d.y, roll: d.roll }}>
          <Layer z={1500} maxBlur={6}>
            <AlbedoView albedo={set.back} lights={lights} opts={relightOpts} />
            <LightShaft id="moon" x={MOON.x} y={MOON.y} angle={MOON.angle} length={150} spread={MOON.spread} color="#CFE0FF" intensity={0.22} />
            <DustMotes frame={f} x={MOON.x} y={MOON.y} angle={MOON.angle} spread={MOON.spread} length={140} color="#E8F0FF" intensity={0.8} />
          </Layer>
          <Layer z={1150} maxBlur={8}>
            <AlbedoView albedo={set.front} lights={lights} opts={relightOpts} />
            <Glow x={LANTERN.x} y={LANTERN.y} r={14} color="#FFC46B" intensity={0.6 * lanternOn * flicker} />
            <SpriteView
              sprite={catAt(f, catState)}
              pal={CAT_PAL}
              anchor={CAT_ANCHOR}
              x={catX}
              y={catY}
              lights={spriteLightsAt(lights, catX, catY - 6)}
              gain={spriteGainAt(lights, catX, catY - 6, ambient)}
            />
          </Layer>
          <Layer z={700} maxBlur={14}>
            <AlbedoView albedo={set.near} lights={lights} opts={{ ambient: 0.1, exposure: 1, dither: 0.4 }} />
          </Layer>
        </CinematicCamera>
        {/* typewriter text grows to the right from a fixed start (centred text would slide while typing) */}
        <AbsoluteFill style={{ alignItems: "flex-start", paddingTop: 112, paddingLeft: 166 }}>
          <PixelType frame={f} start={350} text="MALAM YANG TENANG" size={44} color={C.ivory} perChar={3} />
        </AbsoluteFill>
        <Grade />
        <Vignette />
        <Grain frame={Math.floor(f)} />
        <Exposure color={C.ink} amount={1 - ramp(f, 0, 36, ease.arriveSoft)} />
      </div>
    </AbsoluteFill>
  );
};
