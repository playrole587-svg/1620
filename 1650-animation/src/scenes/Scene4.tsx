// Scene 4 — Bahasa Bisa Jadi Masalah: a Dutch merchant talks, the boy cannot understand.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox, C, FONT_BODY} from '../components/Typography';
import {Mark, Bubble, HighlightBox, Arrow, Particles, Grade, Cloud} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's4';
const LANGS = [
  {w: 'Belanda', y: 592},
  {w: 'Inggris', y: 668},
  {w: 'Prancis', y: 760},
  {w: 'Jerman', y: 850},
].map((l) => ({...l, at: word('s4c', l.w)}));
const tHier = seg('s4d') + 0.2;

export const camera: Key[] = [
  {t: 0, x: 640, y: 380, zoom: 1.2},
  {t: seg('s4a', 'end'), x: 630, y: 420, zoom: 1.24, ease: 'inOutSine'},
  {t: seg('s4b') - 0.4, x: 620, y: 560, zoom: 1.28, ease: 'inOutSine'},
  {t: seg('s4b') + 0.5, x: 660, y: 560, zoom: 1.5, ease: 'inOutCubic'}, // speech bubble
  {t: seg('s4c') + 3.5, x: 640, y: 580, zoom: 1.45, ease: 'inOutSine'},
  {t: LANGS[0].at - 0.5, x: 1270, y: 720, zoom: 1.6, ease: 'inOutCubic'}, // chalkboard
  {t: LANGS[3].at + 1.0, x: 1290, y: 740, zoom: 1.62, ease: 'linear'},
  {t: seg('s4d') + 0.6, x: 780, y: 600, zoom: 1.16, ease: 'inOutCubic'}, // wide
  {t: 29, x: 760, y: 610, zoom: 1.22, ease: 'linear'},
];

const base: BoyPose = {x: 345, y: 1437, scale: 0.88, bodyScale: 1.5, handF: 'grip', handB: 'grip'};
const hold = {armFS: 34, armFE: 62, armBS: 52, armBE: 56};

export const boyTrack: Key[] = [
  {t: 0, ...hold, mouth: 'o', mouthOpen: 0.5, eyeWide: 0.3, sweat: 1, lookX: 1, lookY: 0, headTilt: 0, brow: 1},
  {t: seg('s4b'), lookX: 1, headTilt: -6, mouth: 'o'},
  {t: seg('s4b') + 1.3, headTilt: 10, mouth: 'wavy', eyeWide: 0.7, ease: 'outBack'}, // confused tilt
  {t: seg('s4c'), lookY: 0.7, headTilt: 12, lookX: 0.4, mouth: 'wavy'}, // looks down at the map
  {t: seg('s4c') + 3, armFS: 40, armFE: 52, headTilt: 14},
  {t: seg('s4c') + 5, armFS: 30, armFE: 70, headTilt: 6},
  {t: seg('s4d'), lookY: 0, lookX: 1, headTilt: -4, mouth: 'open', mouthOpen: 0.6},
  {t: 29, mouth: 'open'},
];

const Translation: React.FC<{t: number; t0: number; out: number; x: number; y: number; text: string}> = ({t, t0, out, x, y, text}) => {
  const p = prog(t, t0, 0.4, 'outBack') * (1 - prog(t, out, 0.3, 'inBack'));
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <rect x={-170} y={-28} width={340} height={56} rx={28} fill={C.yellow} stroke={C.navy} strokeWidth={4} />
      <text textAnchor="middle" y={9} fontFamily={FONT_BODY} fontWeight={800} fontSize={26} fill={C.navy}>
        {text}
      </text>
    </g>
  );
};

export const Scene4: React.FC = () => (
  <SceneShell id={S} enter="whip" exit="zoom">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t), props: 'map'};
      const talk = (a: number, b: number) => (t > a && t < b ? Math.sin(t * 9) : 0);
      const gest = talk(seg('s4b') - 0.2, seg('s4b') + 2.2) + talk(tHier - 0.2, tHier + 2.5);
      return (
        <AbsoluteFill>
          <Stage cam={cam} t={t}>
            <Plate scene="scene04" skyDrift={t * 3} />
            <Layer depth={0.5}>
              <PlateSvg>
                <Cloud x={500 + t * 7} y={40} s={1} />
                <Cloud x={1150 + t * 5} y={70} s={0.7} />
              </PlateSvg>
            </Layer>
            <Layer>
              <Cutout scene="scene04" name="dutchman" anim={{...idle(t, 11, 1.4), rot: gest * 0.8}} />
              <Cutout scene="scene04" name="handLeft" anim={{rot: gest * 7, dy: gest * -3}} />
              <Cutout scene="scene04" name="handRight" anim={{rot: -gest * 6, dy: gest * 2}} />
              <PlateSvg>
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene04" />
                <Mark t={t} t0={0.8} x={488} y={410} ch="?" size={110} color={C.red} />
                <Mark t={t} t0={seg('s4c') + 4} x={560} y={460} ch="?" size={80} color={C.red} seed={4} />
                <Bubble t={t} t0={0.45} out={seg('s4b') - 0.45} x={662} y={476} w={250} h={150} text="Goedendag!" tail={[90, 70]} size={34} flag="nl" />
                <Bubble t={t} t0={seg('s4b') - 0.2} x={662} y={476} w={250} h={150} text="Wat zoek je?" tail={[90, 70]} size={34} flag="nl" />
                <Translation t={t} t0={word('s4b', 'artinya')} out={seg('s4c') + 2.5} x={662} y={585} text="= Kamu cari apa?" />
                <Bubble t={t} t0={tHier} x={1172} y={556} w={170} h={150} text={'Hier,\nrechts!'} tail={[-110, 40]} size={34} flag="nl" />
                <Translation t={t} t0={tHier + 1.0} out={28.4} x={1120} y={672} text="= Di sini, ke kanan!" />
                <Arrow t={t} t0={tHier + 1.4} out={28.2} from={[1050, 760]} to={[1230, 770]} bend={-0.2} />
                {LANGS.map((l, i) => (
                  <HighlightBox key={i} t={t} t0={l.at - 0.15} out={l.at + 1.6} x={1232} y={l.y - 40} w={290} h={84} />
                ))}
                <TitleBox t={t} t0={0.12} x={22} y={34} w={804} h={232} lines={['Bahasa Bisa', 'Jadi Masalah']} num="4" size={80} seed={41} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s4c')}
                  read1={seg('s4d', 'end')}
                  x={910}
                  y={100}
                  w={608}
                  h={268}
                  size={25}
                  lines={[
                    'Di tahun 1650, setiap wilayah memiliki',
                    'bahasa yang berbeda. Jika kamu tidak',
                    'mengerti bahasa daerah setempat,',
                    'kamu akan kesulitan berkomunikasi',
                    'untuk membeli barang, bertanya arah,',
                    'atau bahkan meminta bantuan.',
                  ]}
                  keywords={['bahasa', 'berbeda', 'kesulitan', 'membeli', 'arah', 'bantuan']}
                />
              </PlateSvg>
            </Layer>
            <Layer depth={1.2}>
              <PlateSvg>
                <Particles t={t} n={18} x={0} y={300} w={1536} h={700} kind="dust" seed={14} opacity={0.6} />
              </PlateSvg>
            </Layer>
            <Grade vignette={0.4} tint="#ffd59a" tintOpacity={0.08} />
          </Stage>
          <Music name="m_curious" sceneStart={0} dur={29} volume={0.38} offset={4} />
          <Sfx name="market_amb" at={0} volume={0.42} dur={29} fadeOut={1.2} />
          <Sfx name="whoosh" at={0} volume={0.5} />
          <Sfx name="paper" at={0.4} volume={0.55} />
          <Sfx name="pop" at={0.45} volume={0.4} />
          <Sfx name="mumble" at={0.5} volume={0.45} rate={1.05} />
          <Sfx name="pop" at={seg('s4b') - 0.2} volume={0.5} />
          <Sfx name="mumble" at={seg('s4b') - 0.1} volume={0.55} />
          <Sfx name="boing" at={seg('s4b') + 1.2} volume={0.45} />
          <Sfx name="ding" at={word('s4b', 'artinya')} volume={0.4} />
          <Sfx name="paper" at={seg('s4c') + 3} volume={0.5} />
          {LANGS.map((l, i) => (
            <Sfx key={i} name="chalk" at={l.at - 0.15} volume={0.45} />
          ))}
          <Sfx name="pop" at={tHier} volume={0.5} />
          <Sfx name="mumble" at={tHier + 0.05} volume={0.5} rate={1.1} />
          <Sfx name="swish" at={tHier + 1.4} volume={0.4} />
          <Sfx name="whoosh_long" at={28.5} volume={0.55} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);
