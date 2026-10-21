// Scene 3 — Kamu Bisa Jadi Menarik Perhatian: the crowd stares, points and whispers.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog, noise1} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox, C, FONT_BODY} from '../components/Typography';
import {Mark, ShockLines, Arrow, Particles, Grade, Bubble} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's3';
const tKaus = word('s3b', 'kaus');
const tCelana = word('s3b', 'celana');
const tTas = word('s3b', 'tas');
const tCuriga = word('s3d', 'dicurigai');

export const camera: Key[] = [
  {t: 0, x: 768, y: 390, zoom: 1.12},
  {t: seg('s3a', 'end'), x: 740, y: 420, zoom: 1.16, ease: 'inOutSine'},
  {t: seg('s3b') + 0.6, x: 640, y: 680, zoom: 1.5, ease: 'inOutCubic'}, // on the boy: labels
  {t: seg('s3c') - 0.2, x: 640, y: 690, zoom: 1.55, ease: 'linear'},
  {t: seg('s3c') + 0.8, x: 300, y: 560, zoom: 1.45, ease: 'inOutCubic'}, // the pointing man
  {t: seg('s3d') - 0.2, x: 1150, y: 560, zoom: 1.42, ease: 'inOutCubic'}, // whispering on the right
  {t: tCuriga - 0.2, x: 640, y: 560, zoom: 1.4, ease: 'inOutCubic'},
  {t: tCuriga + 0.3, x: 630, y: 540, zoom: 1.7, ease: 'outExpo'}, // punch in: "dicurigai"
  {t: 22.1, x: 630, y: 540, zoom: 1.76, ease: 'linear'},
];

const base: BoyPose = {x: 605, y: 1528, scale: 0.9, bodyScale: 1.9, handF: 'fist', handB: 'fist'};

// fists gripping the backpack straps at chest height (as in the reference)
const grip = {armFS: -18, armFE: 150, armBS: 24, armBE: 128};

export const boyTrack: Key[] = [
  {t: 0, ...grip, mouth: 'open', mouthOpen: 0.6, eyeWide: 0.5, sweat: 1, lookX: 0, lookY: 0, headTilt: 0, headFlip: 1, brow: 1, bob: 0, scale: 0.9, x: 605, pale: 0},
  {t: 1.2, lookX: -1, headFlip: 1},
  {t: 1.7, headFlip: -1, ease: 'inOutBack'}, // glance at the pointing man
  {t: 3.0, headFlip: -1},
  {t: 3.4, headFlip: 1, lookX: 1, ease: 'inOutBack'},
  {t: seg('s3b'), mouth: 'wavy', eyeWide: 0.2, lookY: 0.6, headTilt: 8},
  {t: tTas + 0.6, lookY: 0.6, headTilt: 8},
  {t: seg('s3c'), lookY: 0, headTilt: -4, mouth: 'o', eyeWide: 0.6},
  // nervous step backwards
  {t: seg('s3d') + 0.3, scale: 0.9, x: 605, bob: 0},
  {t: seg('s3d') + 0.7, scale: 0.875, x: 595, bob: -14, ease: 'outQuad'},
  {t: seg('s3d') + 1.0, scale: 0.86, x: 590, bob: 4, ease: 'inQuad'},
  {t: tCuriga - 0.05, mouth: 'o', eyeWide: 0.6, pale: 0},
  {t: tCuriga + 0.15, mouth: 'shout', mouthOpen: 1, eyeWide: 1, pale: 1, ease: 'outBack'},
  {t: 22.1, mouth: 'shout'},
];

const LABEL = (t: number, t0: number, x: number, y: number, text: string, from: [number, number], to: [number, number]) => {
  const p = prog(t, t0, 0.45, 'outBack');
  return (
    <g>
      <Arrow t={t} t0={t0} from={from} to={to} bend={0.2} />
      <g transform={`translate(${x} ${y}) scale(${p})`}>
        <rect x={-92} y={-30} width={184} height={56} rx={14} fill={C.navy} stroke="#fff" strokeWidth={4} />
        <text textAnchor="middle" y={10} fontFamily={FONT_BODY} fontWeight={800} fontSize={30} fill={C.yellow}>
          {text}
        </text>
      </g>
    </g>
  );
};

export const Scene3: React.FC = () => (
  <SceneShell id={S} enter="whip" exit="whip">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t)};
      const jab = (k: number) => Math.max(0, Math.sin((t - k) * 10)) * (t > k && t < k + 1.2 ? 1 : 0);
      const pointJab = jab(0.6) + jab(seg('s3c') + 0.4) + jab(tCuriga);
      return (
        <AbsoluteFill>
          <Stage cam={{...cam, shake: t > tCuriga && t < tCuriga + 0.4 ? 2 : 0}} t={t}>
            <Plate scene="scene03" />
            <Layer>
              <Cutout scene="scene03" name="centerMan" anim={{...idle(t, 6), rot: noise1(t * 0.6, 4) * 1.2}} />
              <Cutout scene="scene03" name="mustache" anim={{...idle(t, 7), rot: Math.sin(t * 1.1) * 0.9}} />
              <Cutout scene="scene03" name="womanRight" anim={{...idle(t, 8), rot: -Math.abs(Math.sin(t * 0.8)) * 1.2}} />
              <Cutout scene="scene03" name="whisperer" anim={{...idle(t, 9), rot: Math.sin(t * 1.4 + 1) * 1.2, dx: Math.sin(t * 1.4) * 3}} />
              <Cutout scene="scene03" name="pointer" anim={{...idle(t, 10), rot: -pointJab * 1.4, dx: pointJab * 10}} />
              <PlateSvg>
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene03" />
                <ShockLines t={t} t0={0.5} x={372} y={312} rot={-28} scale={1.15} />
                <ShockLines t={t} t0={seg('s3c') + 0.2} x={830} y={360} rot={30} />
                <Mark t={t} t0={1.0} x={1155} y={430} ch="?" size={92} color={C.red} />
                <Mark t={t} t0={1.3} x={1305} y={400} ch="?" size={92} color={C.red} seed={3} />
                <Mark t={t} t0={tCuriga} x={790} y={330} ch="!" size={130} seed={2} />
                {t < seg('s3c') + 0.4 && LABEL(t, tKaus, 900, 760, 'Kaus', [810, 760], [700, 790])}
                {t < seg('s3c') + 0.4 && LABEL(t, tCelana, 940, 900, 'Celana', [850, 915], [730, 990])}
                {t < seg('s3c') + 0.4 && LABEL(t, tTas, 260, 800, 'Tas', [340, 805], [440, 820])}
                <Bubble t={t} t0={seg('s3c') + 0.1} out={seg('s3d') + 0.8} x={200} y={260} w={180} h={100} text="?!" tail={[30, 80]} size={46} />
                <Bubble t={t} t0={seg('s3d') - 0.4} out={tCuriga + 1.5} x={1060} y={330} w={170} h={92} text="psst…" tail={[-50, 70]} size={34} />
                <TitleBox t={t} t0={0.12} x={26} y={20} w={884} h={212} lines={['Kamu Bisa Jadi', 'Menarik Perhatian']} num="3" size={68} seed={31} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s3b')}
                  read1={seg('s3d', 'end')}
                  x={914}
                  y={100}
                  w={616}
                  h={236}
                  size={24}
                  lines={[
                    'Cara berpakaian, barang yang kamu bawa,',
                    'dan perilakumu akan terlihat sangat aneh',
                    'bagi orang-orang di tahun 1650, sehingga',
                    'kamu bisa menarik perhatian, dianggap',
                    'orang asing, atau bahkan dicurigai.',
                  ]}
                  keywords={['berpakaian', 'barang', 'perilakumu', 'aneh', 'perhatian', 'asing', 'dicurigai']}
                />
              </PlateSvg>
            </Layer>
            <Layer depth={1.2}>
              <PlateSvg>
                <Particles t={t} n={18} x={0} y={300} w={1536} h={700} kind="dust" seed={13} opacity={0.6} />
              </PlateSvg>
            </Layer>
            <Grade vignette={0.45} />
            {/* red suspicion pulse */}
            <AbsoluteFill
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(170,20,20,0.55) 100%)',
                opacity: t > tCuriga ? 0.8 * (0.6 + 0.4 * Math.sin((t - tCuriga) * 7)) * prog(t, tCuriga, 0.3) : 0,
              }}
            />
          </Stage>
          <Music name="m_curious" sceneStart={0} dur={22.1} volume={0.36} offset={10} />
          <Sfx name="crowd_murmur" at={0} volume={0.5} dur={22} fadeOut={1.5} />
          <Sfx name="whoosh" at={0} volume={0.5} />
          <Sfx name="shock" at={0.5} volume={0.55} />
          <Sfx name="whoosh_soft" at={1.6} volume={0.35} />
          <Sfx name="whoosh_soft" at={3.3} volume={0.35} />
          <Sfx name="pop" at={1.0} volume={0.35} />
          <Sfx name="pop" at={1.3} volume={0.35} rate={1.1} />
          <Sfx name="swish" at={tKaus} volume={0.45} />
          <Sfx name="swish" at={tCelana} volume={0.45} />
          <Sfx name="swish" at={tTas} volume={0.45} />
          <Sfx name="whisper" at={seg('s3c') + 0.2} volume={0.55} />
          <Sfx name="whisper" at={seg('s3d') - 0.4} volume={0.5} />
          <Sfx name="footsteps" at={seg('s3d') + 0.45} volume={0.5} dur={0.9} fadeOut={0.2} />
          <Sfx name="impact" at={tCuriga} volume={0.75} />
          <Sfx name="heartbeat" at={tCuriga + 0.2} volume={0.5} dur={3} fadeOut={1} />
          <Sfx name="whoosh" at={21.85} volume={0.55} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);
