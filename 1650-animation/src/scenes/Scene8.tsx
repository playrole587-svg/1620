// Scene 8 — Hukuman yang Sangat Keras. Serious, historically grounded and deliberately
// non-graphic: dramatic light, a hushed crowd, guards, and symbolic icon cards (no blood, no gore).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog, noise1} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cam, HoleOutline} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox} from '../components/Typography';
import {ImageCard, Rays, Particles, Grade, Mark} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's8';

const Icon: React.FC<{kind: string}> = ({kind}) => {
  const st = {fill: 'none', stroke: '#f3e6cf', strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg viewBox="-60 -60 120 120" style={{width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 40%, #5a3a2c, #2a1914)'}}>
      {kind === 'cambuk' && (
        <g {...st}>
          <path d="M -34 34 L -14 14" strokeWidth={12} />
          <path d="M -14 14 C 10 -10 40 -6 36 -30 C 33 -46 10 -44 4 -30" />
        </g>
      )}
      {kind === 'pasung' && (
        <g {...st}>
          <rect x={-46} y={-22} width={92} height={30} rx={4} />
          <circle cx={-26} cy={-7} r={7} />
          <circle cx={0} cy={-7} r={11} />
          <circle cx={26} cy={-7} r={7} />
          <path d="M -30 8 L -30 44 M 30 8 L 30 44 M -40 44 L 40 44" />
        </g>
      )}
      {kind === 'tangan' && (
        <g {...st}>
          <path d="M -20 36 L -20 -6 L -20 -30 Q -20 -38 -13 -38 Q -6 -38 -6 -30 L -6 -10 L -6 -36 Q -6 -44 1 -44 Q 8 -44 8 -36 L 8 -10 L 8 -30 Q 8 -38 15 -38 Q 22 -38 22 -30 L 22 6 Q 22 30 4 36 Z" />
          <path d="M -44 44 L 44 -44" stroke="#e2363b" strokeWidth={9} />
        </g>
      )}
      {kind === 'mati' && (
        <g {...st}>
          <path d="M -36 44 L -36 -40 L 24 -40 L 24 -26" />
          <path d="M -36 -20 L -16 -40" />
          <path d="M -50 44 L 0 44" />
          <path d="M 24 -26 Q 34 -10 24 4 Q 14 -10 24 -26 Z" strokeWidth={5} />
        </g>
      )}
      {kind === 'penjara' && (
        <g {...st}>
          <rect x={-40} y={-40} width={80} height={80} rx={6} />
          <path d="M -20 -40 L -20 40 M 0 -40 L 0 40 M 20 -40 L 20 40" />
        </g>
      )}
    </svg>
  );
};

const CARDS = [
  {kind: 'cambuk', title: 'Cambuk', body: 'Kesalahan kecil bisa\ndihukum cambuk\ndi depan umum.', at: word('s8b', 'cambuk')},
  {kind: 'pasung', title: 'Pasung', body: 'Dikurung di alat\nkayu di alun-alun\nuntuk dipermalukan.', at: word('s8c', 'dipasung')},
  {kind: 'tangan', title: 'Potong Tangan', body: 'Di beberapa tempat,\npencuri bisa dihukum\npotong tangan.', at: word('s8c', 'potong')},
  {kind: 'mati', title: 'Hukuman Mati', body: 'Untuk kejahatan berat,\ndi depan orang\nbanyak.', at: word('s8d', 'hukuman')},
];

export const camera: Key[] = [
  {t: 0, x: 500, y: 330, zoom: 1.32},
  {t: seg('s8a', 'end'), x: 540, y: 360, zoom: 1.33, ease: 'inOutSine'},
  {t: seg('s8b') - 0.3, x: 600, y: 420, zoom: 1.34, ease: 'inOutSine'},
  {t: seg('s8b') + 2.5, x: 1120, y: 400, zoom: 1.45, ease: 'inOutCubic'}, // scaffold
  {t: CARDS[0].at - 0.6, x: 1060, y: 420, zoom: 1.4, ease: 'inOutSine'},
  {t: CARDS[0].at + 0.4, x: 768, y: 610, zoom: 1.12, ease: 'inOutCubic'}, // cards
  {t: seg('s8d') + 4, x: 768, y: 610, zoom: 1.15, ease: 'linear'},
  {t: seg('s8d', 'end') + 0.2, x: 250, y: 400, zoom: 1.7, ease: 'inOutCubic'}, // boy's frightened face
  {t: 30.67, x: 240, y: 400, zoom: 1.85, ease: 'linear'},
];

const base: BoyPose = {x: 160, y: 1205, scale: 0.88, bodyScale: 1.45, handF: 'fist', handB: 'fist'};
const grip = {armFS: -16, armFE: 148, armBS: 22, armBE: 126};

export const boyTrack: Key[] = [
  {t: 0, ...grip, mouth: 'open', mouthOpen: 0.7, eyeWide: 0.8, sweat: 1, lookX: 1, lookY: -0.2, headTilt: 0, brow: 1, pale: 0.6},
  {t: seg('s8b'), mouth: 'o', pale: 0.8},
  {t: seg('s8c'), mouth: 'wavy', eyeWide: 1},
  {t: seg('s8d'), mouth: 'o', eyeWide: 1, pale: 1},
  {t: seg('s8d', 'end'), mouth: 'shout', mouthOpen: 0.6, eyeWide: 1},
  {t: 30.67, mouth: 'shout'},
];

/** Foreground crowd silhouettes (covers the lower band and adds depth). */
const Crowd: React.FC<{t: number}> = ({t}) => (
  <g>
    {Array.from({length: 16}).map((_, i) => {
      const x = -60 + i * 104 + (i % 2) * 30;
      const h = 150 + ((i * 37) % 60);
      const sway = noise1(t * 0.5 + i, i) * 6;
      const hat = i % 3 === 0;
      return (
        <g key={i} transform={`translate(${x + sway} ${1040 - h})`}>
          <path d={`M -70 ${h + 60} C -70 ${60} -40 ${48} 0 ${48} C 40 ${48} 70 ${60} 70 ${h + 60} Z`} fill="#140d0b" />
          <ellipse cx={0} cy={18} rx={34} ry={38} fill="#1a110e" />
          {hat && <path d="M -52 0 L 52 0 L 30 -10 L 26 -42 L -26 -42 L -30 -10 Z" fill="#0f0a08" />}
          {i % 3 === 1 && <path d="M -38 6 Q 0 -40 38 6 Z" fill="#2a2420" />}
        </g>
      );
    })}
  </g>
);

export const Scene8: React.FC = () => (
  <SceneShell id={S} enter="dip" exit="dream">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const tr = Math.sin(t * 40) * 1.6 + noise1(t * 6, 2) * 1.5; // trembling
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t), x: base.x + tr};
      const drumPulse = Math.max(0, 1 - ((t - 0.2) % 2.4) / 0.4) * (t < seg('s8d', 'end') ? 1 : 0);
      return (
        <AbsoluteFill>
          <Stage cam={{...cam, shake: drumPulse * 0.6}} t={t}>
            <Plate scene="scene08" />
            <Layer>
              <PlateSvg>
                <Rays t={t} x={1250} y={-80} dir={115} spread={36} n={6} opacity={0.14} color="#ffe2b0" len={900} />
                <Particles t={t} n={30} x={700} y={100} w={800} h={500} kind="dust" seed={18} opacity={0.6} />
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene08" />
                <Mark t={t} t0={seg('s8b') + 0.2} out={seg('s8c')} x={330} y={240} ch="!" size={110} />
                <TitleBox t={t} t0={0.25} x={26} y={20} w={874} h={224} lines={['Hukuman yang', 'Sangat Keras']} num="8" size={84} seed={81} />
                <InfoBox
                  t={t}
                  t0={0.6}
                  read0={seg('s8b')}
                  read1={seg('s8d', 'end')}
                  x={908}
                  y={44}
                  w={606}
                  h={214}
                  size={23}
                  lines={[
                    'Di tahun 1650, hukuman jauh lebih keras',
                    'daripada sekarang. Banyak kesalahan, walaupun',
                    'kecil, bisa dikenai hukuman berat seperti',
                    'penjara, cambuk, potong anggota badan,',
                    'atau bahkan hukuman mati di depan umum.',
                  ]}
                  keywords={['keras', 'kecil', 'berat', 'penjara', 'cambuk', 'potong', 'mati']}
                />
              </PlateSvg>
            </Layer>
            <Layer depth={1.12}>
              <PlateSvg>
                <defs>
                  <linearGradient id="crowdfade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#140d0b" stopOpacity={0} />
                    <stop offset="0.22" stopColor="#140d0b" stopOpacity={0.93} />
                    <stop offset="1" stopColor="#0b0706" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <rect x={-200} y={500} width={1936} height={700} fill="url(#crowdfade)" />
                <Crowd t={t} />
              </PlateSvg>
              {CARDS.map((c, i) => (
                <ImageCard
                  key={i}
                  t={t}
                  t0={c.at - 0.3}
                  x={190 + i * 296}
                  y={600}
                  w={262}
                  imgH={128}
                  src=""
                  icon={<Icon kind={c.kind} />}
                  title={c.title}
                  titleBg="#7a1d1d"
                  body={c.body}
                  bodySize={18}
                />
              ))}
            </Layer>
            <Grade vignette={0.65} tint="#3a1010" tintOpacity={0.25} blend="multiply" />
          </Stage>
          <Music name="m_dark" sceneStart={0} dur={30.67} volume={0.5} duck={0.45} />
          <Sfx name="crowd_murmur" at={0.3} volume={0.4} dur={30} fadeOut={2} />
          <Sfx name="wind" at={0} volume={0.35} dur={30.6} fadeOut={2} />
          {Array.from({length: 12}).map((_, k) => {
            const at = 0.2 + k * 2.4;
            return at < seg('s8d', 'end') ? <Sfx key={k} name="drum" at={at} volume={0.55} /> : null;
          })}
          {CARDS.map((c, i) => (
            <Sfx key={`c${i}`} name="impact_soft" at={c.at - 0.3} volume={0.55} />
          ))}
          <Sfx name="whip_crack" at={CARDS[0].at + 0.2} volume={0.3} />
          <Sfx name="wood_creak" at={CARDS[1].at + 0.1} volume={0.5} />
          <Sfx name="heartbeat" at={seg('s8d') + 1} volume={0.7} dur={8.5} fadeOut={0.5} />
          <Sfx name="dream_shimmer" at={28.9} volume={0.7} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);
