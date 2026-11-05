import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";

// A pinhole camera over flat layers placed at real distances. Dolly (z) scales near
// layers faster than far ones, pans shift near layers more than far ones, and depth
// of field is a circle of confusion computed from each layer's distance to the
// focus plane. Nothing here is a preset: the look comes from where things are.

export const FOCAL = 1000; // the subject plane: a layer at Z=1000 moves 1:1 with the camera
export const SCREEN = { w: 1080, h: 1920, cx: 540, cy: 960 };

export type CameraState = {
  /** Pan, in screen px at the subject plane. */
  x: number;
  y: number;
  /** Dolly toward the scene, in the same units as layer Z. */
  z: number;
  /** Roll, degrees. Used sparingly. */
  roll: number;
  /** Distance in focus. */
  focus: number;
  /** Blur in px for a layer twice the focus distance away. */
  aperture: number;
};

export const restCamera: CameraState = { x: 0, y: 0, z: 0, roll: 0, focus: FOCAL, aperture: 0 };

const Ctx = createContext<CameraState>(restCamera);
export const useCamera = () => useContext(Ctx);

/** Screen-space position of a point that sits on a layer at distance Z. */
export const project = (cam: CameraState, Z: number, px: number, py: number) => {
  const s = Z / Math.max(1, Z - cam.z);
  const k = FOCAL / Math.max(1, Z - cam.z);
  return {
    x: SCREEN.cx + s * (px - SCREEN.cx) - cam.x * k,
    y: SCREEN.cy + s * (py - SCREEN.cy) - cam.y * k,
    s,
  };
};

export const CinematicCamera: React.FC<{ cam: CameraState; children: React.ReactNode }> = ({ cam, children }) => (
  <Ctx.Provider value={cam}>
    <AbsoluteFill style={{ transform: cam.roll ? `rotate(${cam.roll}deg)` : undefined, transformOrigin: "50% 50%" }}>
      {children}
    </AbsoluteFill>
  </Ctx.Provider>
);

type LayerProps = {
  /** Distance from the camera at rest. */
  z: number;
  children: React.ReactNode;
  /** Extra blur on top of depth of field (atmospheric haze). */
  haze?: number;
  /** Cap on depth-of-field blur, px. */
  maxBlur?: number;
  style?: React.CSSProperties;
};

export const Layer: React.FC<LayerProps> = ({ z, children, haze = 0, maxBlur = 28, style }) => {
  const cam = useCamera();
  // A layer at or behind the lens is not in the picture. Rendering it would mean a
  // scale in the hundreds (and, with blur, a texture the browser can't rasterise).
  if (z - cam.z < 24) return null;
  const dz = z - cam.z;
  const s = z / dz;
  // Magnified past ~14× a layer is a blur filling the lens; skip it rather than rasterise it.
  if (s > 14) return null;
  const k = FOCAL / dz;
  const coc = Math.min(maxBlur, cam.aperture * Math.abs(z - cam.focus) / Math.max(1, cam.focus) + haze);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-cam.x * k}px, ${-cam.y * k}px) scale(${s})`,
        transformOrigin: `${SCREEN.cx}px ${SCREEN.cy}px`,
        filter: coc > 0.35 ? `blur(${coc.toFixed(2)}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
