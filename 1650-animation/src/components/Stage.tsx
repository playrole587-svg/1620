// Camera + parallax stage. Scenes are composed in "plate space" (the 1536x1024 pixel grid of the
// reference image). The Stage maps plate space onto the 1920x1080 frame through a virtual camera
// {x, y, zoom, rot}; each Layer has a depth factor so the camera move produces parallax
// (sky < plate < foreground).

import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, staticFile, getInputProps} from 'remotion';
import layers from '../../assets/layers.json';
import manifest from '../../assets/plates/manifest.json';
import {noise1} from '../animations/keyframes';

export const PW = 1536;
export const PH = 1024;
export const BASE = 1920 / PW; // plate px -> frame px at zoom 1

export type Cam = {x: number; y: number; zoom: number; rot?: number; shake?: number};

const CamCtx = createContext<{cam: Cam; t: number}>({cam: {x: PW / 2, y: PH / 2, zoom: 1}, t: 0});

/** keep the camera inside the plate (no empty borders) */
export function clampCam(c: Cam): Cam {
  const z = Math.max(1.02, c.zoom);
  const margin = 1 + Math.abs(c.rot ?? 0) * 0.02;
  const hw = (960 / (BASE * z)) * margin;
  const hh = (540 / (BASE * z)) * margin;
  return {...c, zoom: z, x: Math.min(PW - hw, Math.max(hw, c.x)), y: Math.min(PH - hh, Math.max(hh, c.y))};
}

export const Stage: React.FC<{cam: Cam; t: number; children: React.ReactNode; clamp?: boolean}> = ({cam, t, children, clamp = true}) => {
  const c = clamp ? clampCam(cam) : cam;
  const s = c.shake ?? 0;
  const shaken = s
    ? {...c, x: c.x + noise1(t * 9, 1) * 6 * s, y: c.y + noise1(t * 9, 2) * 5 * s, rot: (c.rot ?? 0) + noise1(t * 7, 3) * 0.4 * s}
    : c;
  return (
    <CamCtx.Provider value={{cam: shaken, t}}>
      <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>{children}</AbsoluteFill>
    </CamCtx.Provider>
  );
};

export const useCam = () => useContext(CamCtx);

/** Transform for a layer at parallax depth p (1 = plate plane). */
export function layerTransform(cam: Cam, p: number) {
  const z = 1 + (cam.zoom - 1) * p;
  const cx = PW / 2 + (cam.x - PW / 2) * p;
  const cy = PH / 2 + (cam.y - PH / 2) * p;
  return `translate(960px, 540px) rotate(${(cam.rot ?? 0) * p}deg) scale(${BASE * z}) translate(${-cx}px, ${-cy}px)`;
}

export const Layer: React.FC<{depth?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({depth = 1, children, style}) => {
  const {cam} = useCam();
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, transformOrigin: '0 0', transform: layerTransform(cam, depth), ...style}}>
      {children}
    </div>
  );
};

/** SVG overlay in plate coordinates (inside a Layer). */
export const PlateSvg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

type SceneKey = keyof typeof manifest;
type CutInfo = {x: number; y: number; w: number; h: number; pivot: number[]; src: string};

export const asset = (p: string) => staticFile(`assets/${p}`);

/** Sky + clean plate pair. The sky sits on a deeper layer and is over-scaled to hide edges. */
export const Plate: React.FC<{scene: SceneKey; skyDepth?: number; skyDrift?: number; filter?: string}> = ({scene, skyDepth = 0.45, skyDrift = 0, filter}) => {
  const m = manifest[scene] as {plate: string; sky: string};
  return (
    <>
      <Layer depth={skyDepth}>
        <Img
          src={asset(m.sky)}
          style={{position: 'absolute', left: -PW * 0.15 + skyDrift, top: -PH * 0.15, width: PW * 1.3, height: PH * 1.3, filter}}
        />
      </Layer>
      <Layer depth={1}>
        <Img src={asset(m.plate)} style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, filter}} />
      </Layer>
    </>
  );
};

export type CutAnim = {rot?: number; sx?: number; sy?: number; dx?: number; dy?: number; opacity?: number};

/** A cut-out layer (NPC, hand, horse head...) placed at its original position, animated around its pivot. */
export const Cutout: React.FC<{scene: SceneKey; name: string; anim?: CutAnim; filter?: string}> = ({scene, name, anim = {}, filter}) => {
  const c = (manifest[scene] as {cutouts: Record<string, CutInfo>}).cutouts[name];
  if (!c) throw new Error(`cutout ${scene}/${name} missing`);
  const [px, py] = c.pivot;
  const {rot = 0, sx = 1, sy = 1, dx = 0, dy = 0, opacity = 1} = anim;
  return (
    <Img
      src={asset(c.src)}
      style={{
        position: 'absolute',
        left: c.x,
        top: c.y,
        width: c.w,
        height: c.h,
        opacity,
        filter,
        transformOrigin: `${px - c.x}px ${py - c.y}px`,
        transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sx}, ${sy})`,
      }}
    />
  );
};

export const cropInfo = (scene: SceneKey, name: string) =>
  (manifest[scene] as {crops: Record<string, {x: number; y: number; w: number; h: number; src: string}>}).crops[name];

/** Idle "alive" motion for background characters: breathing + gentle sway, desynchronised by seed. */
export const idle = (t: number, seed: number, amt = 1): CutAnim => ({
  sy: 1 + Math.sin(t * 1.9 + seed * 2.1) * 0.006 * amt,
  sx: 1 - Math.sin(t * 1.9 + seed * 2.1) * 0.002 * amt,
  rot: noise1(t * 0.45, seed) * 0.6 * amt,
});

/** Debug: outline the original boy's (inpainted) silhouette. Enable with --props='{"debug":true}'. */
export const HoleOutline: React.FC<{scene: SceneKey}> = ({scene}) => {
  if (!(getInputProps() as {debug?: boolean}).debug) return null;
  const poly = (layers as unknown as Record<string, {remove: Record<string, number[][]>}>)[scene].remove.boy;
  return <polygon points={poly.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ff00ff" strokeWidth={4} strokeDasharray="12 6" />;
};
