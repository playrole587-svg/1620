// Shared pieces for the film: the scene shell (sky, light, camera, post), subtitles, fades, crowds, candles.
import React, { useMemo } from "react";
import { AdditiveBlending, BoxGeometry, Color, DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial } from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { clamp, ramp } from "../../kits/voxelverse/core/motion";
import { hash } from "../../kits/voxelverse/core/noise";
import { rng } from "../../kits/voxelverse/core/noise";
import { C } from "../../kits/voxelverse/lib/palette";
import { FX_LAYER } from "../../kits/voxelverse/lib/layers";
import { radialTex } from "../../kits/voxelverse/lib/textures";
import type { Vox, V3 } from "../../kits/voxelverse/lib/voxel";
import { cameraAt, type Shot } from "../../kits/voxelverse/camera/rig";
import { CameraRig, Post } from "../../kits/voxelverse/camera/Post";
import { Environment, Fog, Sky, type SkyLook } from "../../kits/voxelverse/world/Atmosphere";
import type { CamState } from "../../kits/voxelverse/camera/rig";
import { SunLight } from "./props";
import { FONT } from "../../core/type/fonts";

export const FILM_FPS = 60;
export const sec = (x: number) => Math.round(x * FILM_FPS);

export type Shell = {
  sky: SkyLook;
  skyBoost?: number;
  env?: number;
  fog: { density: number; color: number };
  light: { from?: V3; intensity?: number; color?: number; fill?: number; size?: number };
  shots: Shot[];
};

/** Everything a scene needs except its own props. `f` is the scene-local film frame (60 fps clock). */
export const SceneShell: React.FC<{ shell: Shell; f: number; children: (cam: CamState) => React.ReactNode }> = ({ shell, f, children }) => {
  const cam = cameraAt(shell.shots, f);
  return (
    <>
      <CameraRig cam={cam} />
      <Sky look={shell.sky} boost={shell.skyBoost ?? 1} />
      <Environment look={shell.sky} intensity={shell.env ?? 0.5} />
      <Fog density={shell.fog.density} color={shell.fog.color} />
      <SunLight {...shell.light} />
      {children(cam)}
      <Post cam={cam} frame={f} />
    </>
  );
};

/** Subtitle: bottom safe zone, fades in and out. Times in seconds on the film clock. */
export type Sub = { from: number; to: number; text: string; big?: boolean };
export const Subtitles: React.FC<{ subs: Sub[]; t: number }> = ({ subs, t }) => {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const cur = subs.find((s) => t >= s.from && t < s.to);
  if (!cur) return null;
  const a = Math.min(ramp(t, cur.from, cur.from + 0.45), 1 - ramp(t, cur.to - 0.45, cur.to));
  const lines = cur.text.split("\n");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 230 * k, display: "flex", justifyContent: "center", opacity: a, transform: `translateY(${(1 - a) * 14 * k}px)` }}>
        <div style={{ whiteSpace: "nowrap", padding: `${22 * k}px ${34 * k}px`, borderRadius: 22 * k, background: "rgba(14,16,18,0.62)", backdropFilter: "blur(6px)", color: "#fff", fontFamily: FONT, fontWeight: cur.big ? 500 : 600, fontSize: (cur.big ? 52 : 38) * k, lineHeight: 1.32, textAlign: "center", letterSpacing: 0.2 * k, textShadow: `0 ${2 * k}px ${10 * k}px rgba(0,0,0,0.5)` }}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Dip to black at both ends of a scene (local seconds). */
export const Dip: React.FC<{ t: number; dur: number; inT?: number; outT?: number; color?: string }> = ({ t, dur, inT = 0.35, outT = 0.45, color = "#07090b" }) => {
  const a = Math.max(1 - ramp(t, 0, inT), ramp(t, dur - outT, dur));
  return a > 0.001 ? <AbsoluteFill style={{ background: color, opacity: a, pointerEvents: "none" }} /> : null;
};

/* ---------------- crowd ---------------- */
export type Person = { x: number; z: number; shirt: number; hair: number; skin: number; h: number; phone: boolean };
const SHIRTS = [0xb36a40, 0x4f7f7b, 0xe6d9bf, 0x8b4a5a, 0x3b5a8a, 0xc9a23a, 0x6f7a8c, 0x2f4d4c];
const HAIRS = [0x1d1612, 0x3a2a22, 0x6b4a2a, 0xc9a23a, 0x1d2224];
const SKINS = [0x93603f, 0xe2ad84, 0xc98f69, 0x6f4529, 0xf0c4a0];

export const people = (seed: number, n: number, x0: number, x1: number, z0: number, z1: number): Person[] => {
  const r = rng(seed);
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ x: x0 + r() * (x1 - x0), z: z0 + r() * (z1 - z0), shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], skin: SKINS[Math.floor(r() * SKINS.length)], h: 0.85 + r() * 0.2, phone: r() < 0.5 });
  }
  return out.sort((a, b) => a.z - b.z);
};

export const crowdBuild = (list: Person[], y = 0, armsUp = false) => (v: Vox) => {
  for (const p of list) {
    const s = p.h;
    v.at([p.x, y, p.z], 0, () => {
      v.box([0, 0.38 * s, 0], [0.34, 0.76 * s, 0.22], 0x3a3d45, { r: 0.04, mat: "fabric" });
      v.box([0, 0.98 * s, 0], [0.46, 0.5 * s, 0.26], p.shirt, { r: 0.05, mat: "fabric" });
      v.box([0, 1.4 * s, 0], [0.3, 0.3, 0.28], p.skin, { r: 0.05 });
      v.box([0, 1.58 * s, -0.01], [0.33, 0.1, 0.3], p.hair, { r: 0.04, mat: "fabric" });
      const raised = armsUp || p.phone;
      for (const sx of [-1, 1]) v.rod([sx * 0.26, 1.15 * s, 0], raised ? [sx * 0.3, 1.7 * s, 0.12] : [sx * 0.28, 0.72 * s, 0.02], 0.1, p.shirt, { r: 0.03, mat: "fabric" });
    });
  }
};

/** Four bobbing bands so the crowd moves without per-person groups. */
export const bob = (f: number, band: number, amp = 0.07, speed = 0.17) => Math.abs(Math.sin(f * speed + band * 1.7)) * amp;

/* ---------------- night details ---------------- */
export const Stars: React.FC<{ n?: number; radius?: number }> = ({ n = 260, radius = 300 }) => {
  const inst = useMemo(() => {
    const geo = new BoxGeometry(1.1, 1.1, 1.1);
    const mat = new MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
    const im = new InstancedMesh(geo, mat, n);
    const m = new Matrix4();
    for (let i = 0; i < n; i++) {
      const th = hash(i * 3 + 1) * Math.PI * 2;
      const ph = Math.acos(0.15 + hash(i * 7 + 2) * 0.85);
      const s = 0.5 + hash(i * 11 + 3) * 1.1;
      m.makeScale(s, s, s).setPosition(Math.sin(ph) * Math.cos(th) * radius, Math.cos(ph) * radius, Math.sin(ph) * Math.sin(th) * radius);
      im.setMatrixAt(i, m);
    }
    im.frustumCulled = false;
    return im;
  }, [n, radius]);
  return <primitive object={inst} />;
};

/** Flat additive halo on the ground / in the air; radius and strength are pure functions of the frame. */
export const Halo: React.FC<{ pos: V3; size: number; color: number; opacity: number; flat?: boolean }> = ({ pos, size, color, opacity, flat = false }) => {
  const mat = useMemo(() => new MeshBasicMaterial({ map: radialTex(), color: new Color(color), transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false }), [color]);
  mat.opacity = clamp(opacity, 0, 1);
  return (
    <mesh position={pos} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} scale={[size, size, 1]} ref={(m) => m?.layers.set(FX_LAYER)} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
};

export const candle = (v: Vox, [x, y, z]: V3, h = 0.22) => {
  v.prism([x, y + h / 2, z], 0.06, h, 0xf1e6c8, { sides: 8, mat: "satin" });
  v.box([x, y + h + 0.015, z], [0.012, 0.03, 0.012], 0x1d2224);
};

export const flowers = (v: Vox, [x, y, z]: V3, n = 9, spread = 0.4) => {
  const cols = [0xe8a7b8, 0xf0e2b0, 0xffffff, 0xc98d74, 0xb89ad9];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28, r = spread * (0.3 + 0.7 * hash(i * 5 + x * 13));
    const fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r * 0.6, fh = 0.25 + hash(i * 3 + z * 7) * 0.2;
    v.rod([fx, y, fz], [fx + 0.02, y + fh, fz], 0.02, C.leaf, { mat: "foliage" });
    v.box([fx + 0.02, y + fh + 0.03, fz], [0.09, 0.07, 0.09], cols[i % cols.length], { mat: "foliage", r: 0.02 });
  }
};
