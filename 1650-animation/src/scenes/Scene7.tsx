// Scene 7 — Harga Barang dan Kehidupan Harian: coins, prices and food at the market stall.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline, cropInfo} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox, C, FONT_BODY} from '../components/Typography';
import {ImageCard, HighlightBox, Particles, Grade, Mark} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's7';
const FOODS = [
  {crop: 'roti', title: 'Roti', body: 'Makanan pokok.\nRelatif murah.', at: word('s7c', 'roti'), cheap: true, row: 0},
  {crop: 'telur', title: 'Telur', body: 'Sumber protein\nyang murah.', at: word('s7c', 'telur'), cheap: true, row: 4},
  {crop: 'sayur', title: 'Sayur', body: 'Terjangkau, tapi\ntak selalu ada.', at: word('s7c', 'sayur'), cheap: true, row: 3},
  {crop: 'ikan', title: 'Ikan', body: 'Mudah didapat di\ndekat sungai/laut.', at: word('s7d', 'ikan'), cheap: true, row: 2},
  {crop: 'daging', title: 'Daging', body: 'Mahal, biasanya\nuntuk orang kaya.', at: word('s7d', 'daging'), cheap: false, row: 1},
  {crop: 'keju', title: 'Keju', body: 'Cukup mahal,\nuntuk orang kaya.', at: word('s7d', 'keju'), cheap: false, row: 5},
];
const COINS = [
  {name: 'Emas', fill: '#f2c14e', edge: '#a8791c', at: word('s7b', 'emas')},
  {name: 'Perak', fill: '#d9dde3', edge: '#8a929c', at: word('s7b', 'perak')},
  {name: 'Tembaga', fill: '#d0814f', edge: '#8a4a26', at: word('s7b', 'tembaga')},
];
// rows of the chalk price board (reference px)
const BOARD_ROWS = [316, 362, 410, 458, 506, 552];

export const camera: Key[] = [
  {t: 0, x: 560, y: 325, zoom: 1.36},
  {t: seg('s7a', 'end'), x: 580, y: 360, zoom: 1.4, ease: 'inOutSine'},
  {t: seg('s7b') + 0.6, x: 640, y: 440, zoom: 1.5, ease: 'inOutCubic'}, // coins
  {t: seg('s7c') - 0.4, x: 650, y: 450, zoom: 1.5, ease: 'linear'},
  {t: seg('s7c') + 0.6, x: 768, y: 715, zoom: 1.08, ease: 'inOutCubic'}, // the counter + cards
  {t: seg('s7e') - 0.3, x: 768, y: 715, zoom: 1.1, ease: 'linear'},
  {t: seg('s7e') + 1.0, x: 860, y: 470, zoom: 1.36, ease: 'inOutCubic'}, // merchant & board
  {t: 33.5, x: 880, y: 460, zoom: 1.42, ease: 'linear'},
];

const base: BoyPose = {x: 430, y: 1266, scale: 0.9, bodyScale: 1.35, handF: 'fist', handB: 'fist', props: 'sack,coin', lean: 4};
const coinUp = {armFS: 20, armFE: 120, armBS: 18, armBE: 110};

export const boyTrack: Key[] = [
  {t: 0, ...coinUp, mouth: 'open', mouthOpen: 0.6, eyeWide: 0.3, sweat: 0.6, lookX: 1, lookY: 0, headTilt: 0, brow: 0.5},
  {t: seg('s7b'), lookY: 0.5, headTilt: 8, mouth: 'o'},
  {t: seg('s7b') + 1, armFS: 34, armFE: 110, ease: 'outBack'},
  {t: seg('s7c'), lookY: 0.2, headTilt: 2, mouth: 'smile', sweat: 0.2},
  {t: FOODS[4].at - 0.1, mouth: 'smile', eyeWide: 0.2},
  {t: FOODS[4].at + 0.2, mouth: 'shout', eyeWide: 1, sweat: 1, ease: 'outBack'}, // expensive!
  {t: seg('s7e'), mouth: 'wavy', eyeWide: 0.4, armFS: 20, armFE: 120},
  {t: 33.5, mouth: 'wavy'},
];

const Coin3: React.FC<{t: number; c: (typeof COINS)[number]; x: number; y: number}> = ({t, c, x, y}) => {
  const p = prog(t, c.at - 0.15, 0.5, 'outBack');
  if (p <= 0) return null;
  const spin = Math.cos((t - c.at) * 5);
  return (
    <g transform={`translate(${x} ${y + Math.sin(t * 2 + x) * 5}) scale(${p})`}>
      <g transform={`scale(${0.25 + 0.75 * Math.abs(spin)} 1)`}>
        <circle r={46} fill={c.edge} />
        <circle r={40} fill={c.fill} stroke={c.edge} strokeWidth={4} />
        <circle r={27} fill="none" stroke={c.edge} strokeWidth={3} opacity={0.7} />
        <text y={12} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize={32} fill={c.edge}>
          {spin > 0 ? 'VOC' : '✦'}
        </text>
      </g>
      <rect x={-62} y={52} width={124} height={40} rx={20} fill={C.navy} />
      <text y={80} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize={24} fill="#fff">
        {c.name}
      </text>
    </g>
  );
};

export const Scene7: React.FC = () => (
  <SceneShell id={S} enter="cut" exit="dip">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t)};
      // coin flip during "koin"
      const flipT = word('s7b', 'koin') - 0.4;
      const fl = Math.max(0, Math.min(1, (t - flipT) / 0.8));
      const flipY = -Math.sin(fl * Math.PI) * 160;
      const reach = Math.sin(Math.min(1, Math.max(0, (t - 0.4) / 2.2)) * Math.PI);
      const focusIdx = FOODS.findIndex((f, i) => t >= f.at && (i === FOODS.length - 1 ? t < f.at + 2.5 : t < FOODS[i + 1].at));
      return (
        <AbsoluteFill>
          <Stage cam={cam} t={t}>
            <Plate scene="scene07" />
            <Layer>
              <Cutout scene="scene07" name="merchant" anim={{...idle(t, 18, 1.3), rot: Math.sin(t * 0.9) * 0.9 - reach * 0.8}} />
              <Cutout scene="scene07" name="merchantHand" anim={{rot: reach * 6 + Math.sin(t * 2.5) * 2, dx: -reach * 6}} />
              <PlateSvg>
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene07" />
                {fl > 0 && fl < 1 && (
                  <g transform={`translate(${560} ${560 + flipY}) scale(${Math.cos(fl * 30)} 1)`}>
                    <circle r={18} fill="#f2c14e" stroke="#7a5418" strokeWidth={5} />
                  </g>
                )}
                {COINS.map((c, i) => (
                  <Coin3 key={i} t={t} c={c} x={650 + i * 145} y={262} />
                ))}
                {FOODS.map((f, i) => (
                  <HighlightBox key={i} t={t} t0={f.at - 0.1} out={f.at + 1.8} x={1262} y={BOARD_ROWS[f.row] - 26} w={270} h={50} r={12} color={f.cheap ? '#8fe07a' : '#ff7a6a'} />
                ))}
                <Mark t={t} t0={FOODS[4].at + 0.2} out={seg('s7e')} x={640} y={330} ch="!" size={110} />
                <TitleBox t={t} t0={0.12} x={30} y={30} w={920} h={214} lines={['Harga Barang', 'dan Kehidupan Harian']} num="7" size={62} seed={71} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s7b')}
                  read1={seg('s7e', 'end')}
                  x={970}
                  y={46}
                  w={560}
                  h={208}
                  size={22}
                  lines={[
                    'Di tahun 1650, harga barang berbeda dengan',
                    'sekarang. Banyak orang harus bekerja keras',
                    'hanya untuk membeli makanan sederhana.',
                    'Uang yang digunakan bukan ringgit atau rupiah,',
                    'melainkan koin emas, perak, atau tembaga.',
                  ]}
                  keywords={['harga', 'bekerja', 'makanan', 'ringgit', 'rupiah', 'koin', 'emas', 'perak', 'tembaga']}
                />
              </PlateSvg>
            </Layer>
            {/* wooden market counter in the foreground (covers the old card band) */}
            <Layer depth={1.06}>
              <PlateSvg>
                <defs>
                  <linearGradient id="wood7" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6b4529" />
                    <stop offset="0.12" stopColor="#53351f" />
                    <stop offset="1" stopColor="#2b1b10" />
                  </linearGradient>
                </defs>
                <rect x={-200} y={700} width={1936} height={420} fill="url(#wood7)" />
                <rect x={-200} y={694} width={1936} height={22} fill="#8a5d39" />
                {Array.from({length: 9}).map((_, i) => (
                  <path key={i} d={`M -200 ${760 + i * 36} L 1736 ${758 + i * 36}`} stroke="#24160d" strokeWidth={3} opacity={0.45} />
                ))}
                {Array.from({length: 7}).map((_, i) => (
                  <rect key={i} x={-120 + i * 290} y={716} width={10} height={400} fill="#21140b" opacity={0.6} />
                ))}
              </PlateSvg>
              {FOODS.map((f, i) => {
                const cr = cropInfo('scene07', f.crop);
                return (
                  <ImageCard
                    key={i}
                    t={t}
                    t0={f.at - 0.25}
                    x={40 + f.row * 245}
                    y={735}
                    w={232}
                    imgH={126}
                    src={cr.src}
                    title={f.title}
                    body={f.body}
                    bodySize={18}
                    focus={focusIdx === i ? 1 : 0}
                  />
                );
              })}
              <PlateSvg>
                {FOODS.map((f, i) => {
                  const p = prog(t, f.at + 0.25, 0.4, 'outBack');
                  if (p <= 0) return null;
                  return (
                    <g key={i} transform={`translate(${40 + f.row * 245 + 200} ${742}) rotate(12) scale(${p})`}>
                      <rect x={-48} y={-17} width={96} height={34} rx={17} fill={f.cheap ? '#2f9e44' : '#d6332f'} stroke="#fff" strokeWidth={3} />
                      <text y={8} textAnchor="middle" fontFamily={FONT_BODY} fontWeight={800} fontSize={20} fill="#fff">
                        {f.cheap ? 'MURAH' : 'MAHAL'}
                      </text>
                    </g>
                  );
                })}
              </PlateSvg>
            </Layer>
            <Layer depth={1.2}>
              <PlateSvg>
                <Particles t={t} n={16} x={0} y={200} w={1536} h={500} kind="dust" seed={17} opacity={0.6} />
              </PlateSvg>
            </Layer>
            <Grade vignette={0.42} tint="#ffcf8a" tintOpacity={0.1} />
          </Stage>
          <Music name="m_market" sceneStart={0} dur={33.53} volume={0.4} />
          <Sfx name="market_amb" at={0} volume={0.45} dur={33.5} fadeOut={1.5} />
          <Sfx name="coins" at={0.4} volume={0.5} />
          <Sfx name="coin_flip" at={flipTime()} volume={0.6} />
          <Sfx name="coin" at={flipTime() + 0.8} volume={0.6} />
          {COINS.map((c, i) => (
            <Sfx key={i} name="coin" at={c.at - 0.15} volume={0.5} rate={1.2 - i * 0.15} />
          ))}
          <Sfx name="whoosh" at={seg('s7c') - 0.1} volume={0.45} />
          {FOODS.map((f, i) => (
            <React.Fragment key={i}>
              <Sfx name="card" at={f.at - 0.25} volume={0.45} rate={1 + i * 0.03} />
              <Sfx name={f.cheap ? 'ding' : 'buzz'} at={f.at + 0.25} volume={0.35} />
            </React.Fragment>
          ))}
          <Sfx name="shock" at={FOODS[4].at + 0.2} volume={0.45} />
          <Sfx name="chalk" at={seg('s7e') + 0.8} volume={0.3} />
          <Sfx name="drum" at={32.9} volume={0.6} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);

function flipTime() {
  return word('s7b', 'koin') - 0.4;
}
