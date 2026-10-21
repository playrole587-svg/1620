// Scene 6 — Kamu Harus Bekerja untuk Hidup: hard daily labour; five kinds of work.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline, cropInfo} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox} from '../components/Typography';
import {ImageCard, ShockLines, Particles, Grade, Cloud} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's6';
const JOBS = [
  {crop: 'petani', title: 'Petani', body: 'Bekerja di ladang\nsepanjang hari.', at: word('s6c', 'petani')},
  {crop: 'pekerjaKasar', title: 'Pekerja Kasar', body: 'Mengangkat barang\nberat di pelabuhan\natau pasar.', at: word('s6c', 'pekerja')},
  {crop: 'pembantu', title: 'Pembantu Rumah', body: 'Melakukan pekerjaan\nrumah untuk\nkeluarga kaya.', at: word('s6d', 'pembantu')},
  {crop: 'pengrajin', title: 'Pengrajin', body: 'Membuat barang\ndari besi, kayu,\natau kain.', at: word('s6d', 'pengrajin')},
  {crop: 'tentara', title: 'Tentara', body: 'Bergabung dengan\nmiliter, berisiko\ntinggi di perang.', at: word('s6d', 'tentara')},
];
const CARD_X = [508, 708, 912, 1120, 1322];

// rhythmic chopping of the worker in the background
const chop = (t: number) => {
  const ph = (t * 0.8) % 1;
  return ph < 0.55 ? -ph / 0.55 : -1 + Math.pow((ph - 0.55) / 0.45, 0.4);
};

export const camera: Key[] = [
  {t: 0, x: 520, y: 325, zoom: 1.36},
  {t: seg('s6a', 'end'), x: 540, y: 360, zoom: 1.38, ease: 'inOutSine'},
  {t: seg('s6b') + 0.3, x: 560, y: 470, zoom: 1.4, ease: 'inOutSine'},
  {t: seg('s6b') + 2.5, x: 1000, y: 450, zoom: 1.45, ease: 'inOutCubic'}, // workers, horse, woman
  {t: seg('s6c') - 0.5, x: 1060, y: 470, zoom: 1.42, ease: 'linear'},
  {t: seg('s6c') + 0.5, x: 1000, y: 700, zoom: 1.22, ease: 'inOutCubic'}, // cards row
  {t: seg('s6e') - 0.3, x: 1010, y: 705, zoom: 1.22, ease: 'linear'},
  {t: seg('s6e') + 1.0, x: 768, y: 560, zoom: 1.08, ease: 'inOutCubic'},
  {t: 31.25, x: 760, y: 560, zoom: 1.12, ease: 'linear'},
];

const base: BoyPose = {x: 380, y: 1324, scale: 0.95, bodyScale: 1.4, handF: 'fist', handB: 'fist', props: 'sack', lean: 6};
// both fists pulling the sack's cloth over the shoulder, at chest height
const carry = {armFS: -22, armFE: 160, armBS: 30, armBE: 150};

export const boyTrack: Key[] = [
  {t: 0, ...carry, mouth: 'open', mouthOpen: 0.8, eyeWide: 0.4, sweat: 1, lookX: 1, headTilt: 4, walk: 0, walkAmt: 0.6, x: 330},
  {t: seg('s6c') + 0.5, x: 400, walk: 9 * 0.6, ease: 'linear'},
  {t: seg('s6c') + 0.5, mouth: 'grit', eyeSquint: 1},
  {t: seg('s6d'), mouth: 'grit', eyeSquint: 1, walkAmt: 0.6},
  {t: seg('s6e'), x: 430, walk: 15 * 0.6, mouth: 'open', eyeSquint: 0, eyeWide: 0.6, walkAmt: 0.3, ease: 'linear'},
  {t: 31.25, x: 440, walk: 18 * 0.6, walkAmt: 0, mouth: 'wavy'},
];

export const Scene6: React.FC = () => (
  <SceneShell id={S} enter="whip" exit="cut">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t)};
      const c = chop(t);
      const focusIdx = JOBS.findIndex((j, i) => t >= j.at && (i === JOBS.length - 1 ? t < j.at + 2.4 : t < JOBS[i + 1].at));
      return (
        <AbsoluteFill>
          <Stage cam={cam} t={t}>
            <Plate scene="scene06" skyDrift={t * 3} />
            <Layer depth={0.5}>
              <PlateSvg>
                <Cloud x={300 + t * 7} y={40} s={1} />
                <Cloud x={1100 + t * 5} y={20} s={0.75} />
              </PlateSvg>
            </Layer>
            <Layer>
              <Cutout scene="scene06" name="chopper" anim={{rot: c * 4, dy: -c * 4}} />
              <Cutout scene="scene06" name="horseHead" anim={{rot: Math.sin(t * 1.3) * 4 + (Math.sin(t * 0.37) > 0.9 ? 6 : 0)}} />
              <Cutout scene="scene06" name="basketWoman" anim={{...idle(t, 17, 1.6), dy: Math.abs(Math.sin(t * 1.8)) * -3}} />
              <PlateSvg>
                <Particles t={t * 1.5} n={8} x={820} y={560} w={120} h={90} kind="ember" seed={6} opacity={0.0} />
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene06" />
                <ShockLines t={t} t0={0.6} x={215} y={318} rot={-30} />
                <TitleBox t={t} t0={0.12} x={30} y={40} w={880} h={220} lines={['Kamu Harus', 'Bekerja untuk Hidup']} num="6" size={64} seed={61} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s6b')}
                  read1={seg('s6e', 'end')}
                  x={890}
                  y={70}
                  w={614}
                  h={240}
                  size={24}
                  lines={[
                    'Di tahun 1650, kebanyakan orang harus',
                    'bekerja keras setiap hari untuk mendapatkan',
                    'makanan, tempat tinggal, dan kebutuhan',
                    'lainnya. Tidak ada gaji tinggi seperti sekarang,',
                    'dan pekerjaan biasanya berat serta berisiko.',
                  ]}
                  keywords={['bekerja', 'makanan', 'tinggal', 'gaji', 'berat', 'berisiko']}
                />
              </PlateSvg>
            </Layer>
            {/* foreground timber pile (depth) + the job cards on top of it */}
            <Layer depth={1.06}>
              <PlateSvg>
                <defs>
                  <linearGradient id="plank6" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7a5232" />
                    <stop offset="1" stopColor="#2e1d11" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((k) => (
                  <g key={k} transform={`translate(0 ${694 + k * 62})`}>
                    <rect x={-220} y={0} width={1980} height={58} rx={12} fill="url(#plank6)" stroke="#1e130b" strokeWidth={4} />
                    {Array.from({length: 9}).map((_, i) => (
                      <ellipse key={i} cx={-120 + i * 230 + (k % 2) * 110} cy={29} rx={16} ry={7} fill="#4a301c" opacity={0.7} />
                    ))}
                    <path d={`M -220 18 L 1760 ${16 + k}`} stroke="#9b6c44" strokeWidth={3} opacity={0.5} />
                  </g>
                ))}
                <rect x={-220} y={676} width={1980} height={26} fill="#1e130b" opacity={0.35} />
                <rect x={-220} y={940} width={1980} height={200} fill="#24170d" />
              </PlateSvg>
              {JOBS.map((j, i) => {
                const cr = cropInfo('scene06', j.crop);
                return (
                  <ImageCard
                    key={i}
                    t={t}
                    t0={j.at - 0.25}
                    x={CARD_X[i]}
                    y={646}
                    w={196}
                    imgH={170}
                    src={cr.src}
                    round
                    title={j.title}
                    body={j.body}
                    bodySize={16}
                    focus={focusIdx === i ? 1 : 0}
                  />
                );
              })}
            </Layer>
            <Grade vignette={0.42} tint="#ffcf8a" tintOpacity={0.1} />
          </Stage>
          <Music name="m_work" sceneStart={0} dur={31.25} volume={0.4} />
          <Sfx name="market_amb" at={0} volume={0.35} dur={31.2} fadeOut={1} />
          <Sfx name="whoosh" at={0} volume={0.5} />
          <Sfx name="strain" at={0.5} volume={0.55} />
          <Sfx name="horse" at={seg('s6b') + 2.2} volume={0.5} />
          <Sfx name="hooves" at={seg('s6b') + 2.6} volume={0.35} dur={4} fadeOut={1.5} />
          {Array.from({length: 24}).map((_, k) => {
            const at = (k + 0.55) / 0.8;
            return at < 31 ? <Sfx key={k} name="chop" at={at} volume={0.32} /> : null;
          })}
          {Array.from({length: 22}).map((_, k) => (
            <Sfx key={`s${k}`} name="step" at={0.4 + k * 0.83} volume={0.25} rate={0.9 + (k % 3) * 0.05} />
          ))}
          {JOBS.map((j, i) => (
            <Sfx key={`c${i}`} name="card" at={j.at - 0.25} volume={0.5} rate={1 + i * 0.04} />
          ))}
          <Sfx name="anvil" at={JOBS[3].at + 0.2} volume={0.4} />
          <Sfx name="whoosh_soft" at={31.0} volume={0.4} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);
