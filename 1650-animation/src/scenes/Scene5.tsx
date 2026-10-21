// Scene 5 — Kondisi Hidup Lebih Keras: dirty streets, poor sanitation, disease.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox, C, FONT_BODY} from '../components/Typography';
import {Mark, Particles, Grade} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's5';
const DISEASES = [
  {name: 'Cacar', at: word('s5c', 'cacar'), x: 1080, y: 560},
  {name: 'Disentri', at: word('s5c', 'disentri'), x: 1250, y: 470},
  {name: 'Wabah Pes', at: word('s5c', 'wabah'), x: 1400, y: 560},
];

export const camera: Key[] = [
  {t: 0, x: 420, y: 345, zoom: 1.28},
  {t: seg('s5a', 'end'), x: 430, y: 380, zoom: 1.3, ease: 'inOutSine'},
  {t: seg('s5b') - 0.2, x: 440, y: 540, zoom: 1.3, ease: 'inOutSine'},
  {t: seg('s5b') + 3.2, x: 600, y: 640, zoom: 1.55, ease: 'inOutCubic'}, // pouring dirty water
  {t: seg('s5c') - 0.4, x: 640, y: 660, zoom: 1.6, ease: 'linear'},
  {t: seg('s5c') + 0.8, x: 1180, y: 600, zoom: 1.5, ease: 'inOutCubic'}, // the sick bed
  {t: seg('s5d') - 0.2, x: 1200, y: 600, zoom: 1.55, ease: 'linear'},
  {t: seg('s5d') + 1.0, x: 768, y: 560, zoom: 1.1, ease: 'inOutCubic'},
  {t: 25.8, x: 740, y: 560, zoom: 1.16, ease: 'linear'},
];

const base: BoyPose = {x: 215, y: 1324, scale: 0.95, bodyScale: 1.4, handF: 'fist', handB: 'fist'};
const grip = {armFS: -16, armFE: 148, armBS: 22, armBE: 126};

export const boyTrack: Key[] = [
  {t: 0, ...grip, mouth: 'open', mouthOpen: 0.7, eyeWide: 0.6, sweat: 1, lookX: 1, lookY: 0, headTilt: 0, brow: 1, pale: 0, eyeSquint: 0},
  {t: seg('s5b') + 3.0, mouth: 'open', eyeWide: 0.6, eyeSquint: 0, headTilt: 0},
  {t: seg('s5b') + 3.6, mouth: 'grit', eyeSquint: 1, headTilt: -10, lean: -4, ease: 'outBack'}, // disgusted
  {t: seg('s5c') - 0.3, mouth: 'grit', eyeSquint: 1, headTilt: -10},
  {t: seg('s5c') + 0.3, mouth: 'o', eyeSquint: 0, eyeWide: 0.8, headTilt: 2, lean: 0, pale: 0.8},
  {t: seg('s5d'), mouth: 'wavy', eyeWide: 0.4, pale: 0.4},
  {t: 25.8, mouth: 'wavy'},
];

const Germ: React.FC<{t: number; s?: number}> = ({t, s = 1}) => (
  <g transform={`rotate(${t * 40}) scale(${s})`}>
    {Array.from({length: 8}).map((_, i) => (
      <g key={i} transform={`rotate(${i * 45})`}>
        <path d="M 0 -16 L 0 -26" stroke="#3b7d2e" strokeWidth={4} strokeLinecap="round" />
        <circle cy={-28} r={4} fill="#5fb84a" stroke="#2c5e22" strokeWidth={2} />
      </g>
    ))}
    <circle r={17} fill="#7fd45f" stroke="#2c5e22" strokeWidth={3} />
    <circle cx={-5} cy={-4} r={4} fill="#4f9a3c" />
    <circle cx={6} cy={5} r={3} fill="#4f9a3c" />
  </g>
);

export const Scene5: React.FC = () => (
  <SceneShell id={S} enter="zoom" exit="whip">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t)};
      return (
        <AbsoluteFill>
          <Stage cam={cam} t={t}>
            <Plate scene="scene05" skyDrift={t * 3} />
            <Layer>
              <Cutout scene="scene05" name="pourer" anim={{...idle(t, 15), rot: Math.sin(t * 1.6) * 1.2}} />
              <Cutout scene="scene05" name="patient" anim={{sy: 1 + Math.sin(t * 2.2) * 0.012}} />
              <Cutout scene="scene05" name="nurse" anim={{...idle(t, 16), rot: Math.sin(t * 1.2) * 1.1, dy: Math.sin(t * 1.2) * 2}} />
              <PlateSvg>
                {/* animated stream of dirty water from the tipped barrel */}
                {[0, 1, 2].map((k) => (
                  <path
                    key={k}
                    d={`M ${662 + k * 8} 660 C ${676 + k * 6} 700 ${684 + k * 4} 740 ${690 + k * 5} 790`}
                    fill="none"
                    stroke={k === 1 ? '#8a7a55' : '#5b4c33'}
                    strokeWidth={10 - k * 2}
                    strokeLinecap="round"
                    strokeDasharray="26 16"
                    strokeDashoffset={-t * 260 - k * 13}
                    opacity={0.75}
                  />
                ))}
                {[0, 1, 2].map((k) => {
                  const ph = (t * 0.9 + k / 3) % 1;
                  return <ellipse key={k} cx={700} cy={800} rx={20 + ph * 90} ry={6 + ph * 22} fill="none" stroke="#d9cfae" strokeWidth={3} opacity={(1 - ph) * 0.6} />;
                })}
                <Particles t={t} n={10} x={560} y={760} w={260} h={140} kind="fly" seed={3} />
                <Particles t={t} n={6} x={1250} y={600} w={220} h={120} kind="fly" seed={8} />
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene05" />
                <Mark t={t} t0={0.6} x={505} y={360} ch="!" size={120} />
                {DISEASES.map((d, i) => {
                  const p = prog(t, d.at - 0.1, 0.45, 'outBack');
                  if (p <= 0) return null;
                  return (
                    <g key={i} transform={`translate(${d.x} ${d.y + Math.sin(t * 2 + i) * 6}) scale(${p})`}>
                      <rect x={-96} y={-30} width={192} height={60} rx={30} fill="#fff" stroke={C.navy} strokeWidth={4} />
                      <g transform="translate(-62 0) scale(0.75)">
                        <Germ t={t + i} />
                      </g>
                      <text x={18} y={10} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize={27} fill="#2e6b22">
                        {d.name}
                      </text>
                    </g>
                  );
                })}
                <TitleBox t={t} t0={0.12} x={30} y={36} w={840} h={238} lines={['Kondisi Hidup', 'Lebih Keras']} num="5" size={84} seed={51} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s5b')}
                  read1={seg('s5d', 'end')}
                  x={913}
                  y={54}
                  w={600}
                  h={304}
                  size={25}
                  lines={[
                    'Kebersihan, kesehatan, dan makanan',
                    'belum sebaik sekarang. Penyakit seperti',
                    'cacar, disentri, dan wabah pes lebih',
                    'mudah menyebar, dan banyak orang',
                    'meninggal di usia muda. Hidup di tahun',
                    '1650 jauh lebih berisiko dan penuh',
                    'tantangan daripada sekarang.',
                  ]}
                  keywords={['kebersihan', 'kesehatan', 'makanan', 'cacar', 'disentri', 'wabah', 'pes', 'muda', 'berisiko']}
                />
              </PlateSvg>
            </Layer>
            <Grade vignette={0.5} tint="#6f8a4a" tintOpacity={0.12} blend="multiply" />
          </Stage>
          <Music name="m_tense" sceneStart={0} dur={25.75} volume={0.42} />
          <Sfx name="town_amb" at={0} volume={0.45} dur={25.7} fadeOut={1.5} />
          <Sfx name="flies" at={0.3} volume={0.3} dur={25} fadeOut={1.5} />
          <Sfx name="shock" at={0.6} volume={0.5} />
          <Sfx name="water_pour" at={seg('s5b') + 2.6} volume={0.6} />
          <Sfx name="splash" at={seg('s5b') + 3.4} volume={0.5} />
          <Sfx name="whoosh" at={seg('s5c') - 0.1} volume={0.4} />
          <Sfx name="cough" at={seg('s5c') + 1.2} volume={0.5} />
          {DISEASES.map((d, i) => (
            <Sfx key={i} name="pop" at={d.at - 0.1} volume={0.45} rate={0.9 + i * 0.08} />
          ))}
          <Sfx name="wind" at={seg('s5d')} volume={0.35} dur={6} fadeOut={2} />
          <Sfx name="whoosh" at={25.5} volume={0.55} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);
