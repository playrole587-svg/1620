// The full film: 60 s, seven dioramas, Indonesian subtitles, no voice-over. Each scene mounts only while
// it is on screen; everything is a pure function of the composition frame.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { PCFShadowMap } from "three";
import { Dip, FILM_FPS, Subtitles, sec, type Sub } from "./common";
import { Birth, Childhood, Memorial } from "./sceneStreet";
import { Studio } from "./sceneRoom";
import { Viral, Stage } from "./sceneLive";
import { Court } from "./sceneCourt";

export const FILM_SECONDS = 60;

type SceneDef = { id: string; from: number; dur: number; C: React.FC<{ f: number }> };
export const SCENES: SceneDef[] = [
  { id: "birth", from: 0, dur: 8.6, C: Birth },
  { id: "child", from: 8.5, dur: 8.6, C: Childhood },
  { id: "studio", from: 17, dur: 9.2, C: Studio },
  { id: "viral", from: 26, dur: 9.2, C: Viral },
  { id: "stage", from: 35, dur: 9.2, C: Stage },
  { id: "court", from: 44, dur: 8.2, C: Court },
  { id: "memorial", from: 52, dur: 8, C: Memorial },
];

export const SUBS: Sub[] = [
  { from: 0.8, to: 7.9, text: "Plantation, Florida, 23 Januari 1998.\nJahseh Onfroy lahir." },
  { from: 9.3, to: 16.4, text: "Masa kecilnya tidak mudah: sering pindah\nrumah dan bermasalah sejak remaja." },
  { from: 17.8, to: 25.6, text: "Di kamar kecil, ia merekam lagu\ndan mengunggahnya ke SoundCloud." },
  { from: 26.8, to: 34.6, text: "Tahun 2017, “Look at Me!” meledak\ndi internet dan mengenalkan namanya." },
  { from: 35.8, to: 43.6, text: "Album “?” (2018) debut di puncak\nBillboard 200." },
  { from: 44.8, to: 51.6, text: "Ia juga menghadapi tuduhan kekerasan dalam\nrumah tangga, perkara yang belum tuntas." },
  { from: 52.8, to: 57.2, text: "18 Juni 2018, ia ditembak dalam perampokan\ndi Deerfield Beach. Usianya 20 tahun." },
  { from: 57.5, to: 59.9, text: "Jahseh “XXXTentacion” Onfroy\n1998 – 2018", big: true },
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const f0 = t * FILM_FPS;
  const scene = [...SCENES].reverse().find((s) => t >= s.from) ?? SCENES[0];
  const local = f0 - sec(scene.from);
  const Scn = scene.C;
  return (
    <AbsoluteFill style={{ backgroundColor: "#07090b" }}>
      <ThreeCanvas key={scene.id} width={width} height={height} shadows={{ type: PCFShadowMap }} dpr={1}
        gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.03, far: 600, position: [0, 3, 10] }}>
        <Scn f={local} />
      </ThreeCanvas>
      <Dip t={t - scene.from} dur={Math.min(scene.dur, (SCENES[SCENES.indexOf(scene) + 1]?.from ?? FILM_SECONDS) - scene.from)} />
      <Subtitles subs={SUBS} t={t} />
    </AbsoluteFill>
  );
};
