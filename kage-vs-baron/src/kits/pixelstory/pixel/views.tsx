import React, { useMemo } from "react";
import { PixelCanvas } from "./PixelCanvas";
import { rasterize, type Palette, type Sprite, type SpriteLight } from "./sprite";
import type { Albedo } from "../environment/albedo";
import { relight, type Light, type RelightOpts } from "../lighting/relight";

/** Screen pixels per art pixel for every set in the film. One pixel scale, no mixels. */
export const PX = 8;

type SpriteViewProps = {
  sprite: Sprite;
  pal: Palette;
  /** Anchor point inside the sprite (art px), placed at (x, y) in set coordinates. */
  anchor: { x: number; y: number };
  x: number;
  y: number;
  lights?: SpriteLight[];
  gain?: number;
  flip?: boolean;
  opacity?: number;
  scale?: number;
  style?: React.CSSProperties;
};

export const SpriteView: React.FC<SpriteViewProps> = ({
  sprite,
  pal,
  anchor,
  x,
  y,
  lights = [],
  gain = 1,
  flip = false,
  opacity = 1,
  scale = PX,
  style,
}) => {
  const pixels = useMemo(() => rasterize(sprite, pal, lights, 1, gain), [sprite, pal, lights, gain]);
  // On the set's own pixel scale, snap to the art grid so the sprite never sits between
  // pixels. Sprites drawn smaller (distant objects) are placed freely.
  const left = scale === PX ? Math.round(x - anchor.x) * PX : x * PX - anchor.x * scale;
  const top = scale === PX ? Math.round(y - anchor.y) * PX : y * PX - anchor.y * scale;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        opacity,
        transform: flip ? "scaleX(-1)" : undefined,
        transformOrigin: `${anchor.x * scale}px ${anchor.y * scale}px`,
        ...style,
      }}
    >
      <PixelCanvas w={sprite.w} h={sprite.h} pixels={pixels} scale={scale} />
    </div>
  );
};

type AlbedoViewProps = {
  albedo: Albedo;
  lights: Light[];
  opts: RelightOpts;
  style?: React.CSSProperties;
};

/** A painted set layer, relit for the current frame. */
export const AlbedoView: React.FC<AlbedoViewProps> = ({ albedo, lights, opts, style }) => {
  const key = JSON.stringify([lights, opts]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pixels = useMemo(() => relight(albedo, lights, opts), [albedo, key]);
  return (
    <div style={{ position: "absolute", left: albedo.ox * PX, top: albedo.oy * PX, ...style }}>
      <PixelCanvas w={albedo.w} h={albedo.h} pixels={pixels} scale={PX} />
    </div>
  );
};
