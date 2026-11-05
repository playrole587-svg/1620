import React from "react";
import { Composition } from "remotion";
import { PRESETS } from "./core/film/frame.ts";
import { Showcase } from "./scenes/showcase/Showcase.tsx";
import { KageFilm, KAGE_FILM_SECONDS } from "./scenes/kage/KageFilm.tsx";

// Register each film twice: a preview (540 × 960 @ 30, for approval) and a final (1080 × 1920 @ 60).
const { preview, final } = PRESETS;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="KagePreview" component={KageFilm} durationInFrames={KAGE_FILM_SECONDS * preview.fps} fps={preview.fps} width={preview.width} height={preview.height} />
    <Composition id="KageFinal" component={KageFilm} durationInFrames={KAGE_FILM_SECONDS * final.fps} fps={final.fps} width={final.width} height={final.height} />
    <Composition id="ShowcasePreview" component={Showcase} durationInFrames={6 * preview.fps} fps={preview.fps} width={preview.width} height={preview.height} />
  </>
);
