// Scene 1 — Terbangun di Tahun 1650: the boy wakes up on a 1650 harbour quay (VOC era).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog, noise1} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, C, FONT_TITLE} from '../components/Typography';
import {Mark, ShockLines, Flag, Gull, Cloud, Particles, Rays, Grade} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's1';
const tTitle = seg('s1e');
const tRealise = seg('s1d');
const t2026 = word('s1d', '2026');
const t1650 = word('s1d', '1650');

export const camera: Key[] = [
  {t: 0, x: 720, y: 640, zoom: 1.8},
  {t: 2.6, x: 730, y: 630, zoom: 1.7, ease: 'inOutSine'},
  {t: seg('s1b') - 0.2, x: 740, y: 620, zoom: 1.62, ease: 'inOutSine'},
  {t: seg('s1b') + 1.6, x: 1250, y: 560, zoom: 1.55, ease: 'inOutCubic'}, // pan to the busy harbour
  {t: seg('s1c') + 2.0, x: 1290, y: 430, zoom: 1.75, ease: 'inOutCubic'}, // tilt up: ships & flags
  {t: seg('s1c') + 5.0, x: 1230, y: 600, zoom: 1.6, ease: 'inOutCubic'}, // people on the quay
  {t: tRealise + 0.4, x: 730, y: 640, zoom: 1.6, ease: 'inOutCubic'}, // back to the boy
  {t: t1650, x: 740, y: 640, zoom: 1.8, ease: 'outExpo'}, // punch-in on "1650!"
  {t: tTitle - 0.3, x: 740, y: 630, zoom: 1.75, ease: 'linear'},
  {t: tTitle + 1.0, x: 768, y: 512, zoom: 1.04, ease: 'inOutCubic'}, // wide reveal + title
  {t: 31, x: 768, y: 512, zoom: 1.1, ease: 'linear'},
];

const base: BoyPose = {
  x: 690,
  y: 1075,
  scale: 0.98,
  bodyScale: 1.4,
  sit: 1,
  legFH: 84,
  legBH: 78,
  legFK: 14,
  legBK: 4,
  armBS: -38,
  armBE: -10,
  handB: 'open',
  armFS: 18,
  armFE: 30,
  handF: 'open',
};

export const boyTrack: Key[] = [
  {t: 0, eyeOpen: 0, headTilt: 14, lean: -6, mouth: 'flat', mouthOpen: 1, lookX: 0, lookY: 0, headFlip: 1, eyeWide: 0, sweat: 0, pale: 0, armFS: 18, armFE: 30},
  {t: 1.0, eyeOpen: 0.45, ease: 'inOutCubic'},
  {t: 1.45, eyeOpen: 0.05},
  {t: 2.4, eyeOpen: 1, headTilt: 4, lean: 0, ease: 'inOutCubic'},
  {t: seg('s1a') + 0.3, mouth: 'o', lookX: 0.6},
  {t: seg('s1a') + 1.4, headFlip: 1, ease: 'inOutCubic'},
  {t: seg('s1a') + 1.8, headFlip: -1, lookX: 0.8, headTilt: -4, ease: 'inOutBack'}, // looks behind
  {t: seg('s1a') + 2.9, headFlip: -1},
  {t: seg('s1a') + 3.3, headFlip: 1, headTilt: 6, ease: 'inOutBack'}, // looks back
  {t: seg('s1b'), lookX: 1, lookY: -0.2, mouth: 'open', mouthOpen: 0.4},
  {t: seg('s1c'), lookY: -0.6, headTilt: -6},
  {t: tRealise - 0.2, lookY: 0, headTilt: 0, mouth: 'o', eyeWide: 0, sweat: 0, armFS: 18, armFE: 30},
  {t: t2026 - 0.2, eyeWide: 0.4, sweat: 0.6},
  {t: t1650 - 0.05, eyeWide: 0.4, mouth: 'o', pale: 0, lean: 0, headTilt: 0, armFS: 18, armFE: 30},
  {t: t1650 + 0.1, eyeWide: 1, mouth: 'shout', mouthOpen: 1, sweat: 1, pale: 1, headTilt: -8, lean: -10, armFS: 70, armFE: 70, ease: 'outBack'},
  {t: tTitle, eyeWide: 0.8, mouth: 'open', mouthOpen: 0.7, headTilt: -4, lean: -6, armFS: 40, armFE: 60},
  {t: 31, eyeWide: 0.8},
];

export const Scene1: React.FC = () => (
  <SceneShell id={S} enter="eyes" exit="whip">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t)};
      const wake = 1 - prog(t, 0.2, 2.6, 'inOutCubic');
      const shake = t > t1650 && t < t1650 + 0.5 ? 1 - (t - t1650) / 0.5 : 0;
      return (
        <AbsoluteFill>
          <Stage cam={{...cam, shake: shake * 3}} t={t}>
            <AbsoluteFill style={{filter: wake > 0.01 ? `blur(${wake * 14}px) brightness(${1 + wake * 0.3})` : undefined}}>
              <Plate scene="scene01" skyDrift={t * 4} />
              <Layer depth={0.5}>
                <PlateSvg>
                  <Cloud x={200 + t * 9} y={70} s={1.1} />
                  <Cloud x={1050 + t * 6} y={120} s={0.8} opacity={0.85} />
                  <Cloud x={1380 + t * 7} y={40} s={0.7} opacity={0.8} />
                </PlateSvg>
              </Layer>
              <Layer depth={1}>
                <PlateSvg>
                  {/* flags on the masts, waving */}
                  <path d="M 1250 140 L 1250 250" stroke="#4a3426" strokeWidth={4} />
                  <Flag x={1250} y={146} w={78} h={54} t={t} />
                  <Flag x={1020} y={366} w={46} h={30} t={t} seed={2} />
                  {/* gulls */}
                  <Gull x={((t * 60) % 1900) - 200} y={260 + Math.sin(t * 0.8) * 30} t={t} s={1.1} />
                  <Gull x={((t * 45 + 700) % 1900) - 200} y={200 + Math.sin(t * 0.6 + 2) * 25} t={t} s={0.8} seed={3} />
                  <Gull x={1600 - ((t * 38) % 2000)} y={320 + Math.sin(t * 0.9) * 20} t={t} s={0.7} seed={5} />
                  {/* sun glints on the water */}
                  <Particles t={t} n={14} x={860} y={725} w={160} h={30} kind="sparkle" seed={4} />
                </PlateSvg>
                <Cutout scene="scene01" name="vendorLeft" anim={idle(t, 1)} />
                <Cutout scene="scene01" name="porter" anim={{...idle(t, 2, 1.4), dy: Math.abs(Math.sin(t * 2.4)) * -3}} />
                <Cutout scene="scene01" name="gentleman" anim={{...idle(t, 3), rot: noise1(t * 0.5, 9) * 0.8}} />
                <PlateSvg>
                  <Rays t={t} x={1560} y={-60} dir={124} spread={30} opacity={0.07} len={1100} />
                  <Boy pose={pose} frame={frame} />
                  <HoleOutline scene="scene01" />
                  {/* realisation graphics */}
                  <Mark t={t} t0={seg('s1a') + 0.6} out={seg('s1b') + 0.4} x={870} y={480} ch="?" size={110} />
                  <ShockLines t={t} t0={t1650 + 0.05} x={545} y={420} rot={-35} scale={1.3} />
                  <ShockLines t={t} t0={t1650 + 0.1} x={880} y={430} rot={35} scale={1.3} />
                  <Mark t={t} t0={tTitle + 0.6} x={905} y={455} ch="?" size={110} seed={2} />

                </PlateSvg>
              </Layer>
              <Layer depth={1.18}>
                <PlateSvg>
                  <defs>
                    <linearGradient id="post1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#3b2617" />
                      <stop offset="0.45" stopColor="#6e4a2c" />
                      <stop offset="1" stopColor="#2e1d11" />
                    </linearGradient>
                  </defs>
                  <rect x={430} y={-200} width={96} height={1400} fill="url(#post1)" stroke="#1f140c" strokeWidth={5} />
                  {[160, 470, 820].map((y) => (
                    <path key={y} d={`M 438 ${y} q 40 10 80 -6`} stroke="#2a1a0f" strokeWidth={4} fill="none" opacity={0.7} />
                  ))}
                  <rect x={418} y={560} width={120} height={26} rx={6} fill="#4a301c" stroke="#1f140c" strokeWidth={4} />
                </PlateSvg>
              </Layer>
              <Layer depth={1.25}>
                <PlateSvg>
                  <Particles t={t} n={26} x={0} y={300} w={1536} h={700} kind="dust" seed={7} opacity={0.8} />
                </PlateSvg>
              </Layer>
              <Layer depth={1}>
                <PlateSvg>
                  <TitleBox
                    t={t}
                    t0={tTitle + 0.25}
                    x={58}
                    y={104}
                    w={800}
                    h={300}
                    lines={['Apa Terjadi Jika', 'Kita Terbangun', 'di Tahun 1650?']}
                    accentFrom={2}
                    size={78}
                    seed={11}
                  />
                </PlateSvg>
              </Layer>
            </AbsoluteFill>
            <Grade vignette={0.42} tint="#ffcf8a" tintOpacity={0.1} />
          </Stage>
          <YearSlam t={t} />
          {/* ---- sound ---- */}
          <Music name="m_harbor" sceneStart={0} dur={31} volume={0.42} />
          <Sfx name="dream_shimmer" at={0} volume={0.7} />
          <Sfx name="harbor_amb" at={0.6} volume={0.55} dur={30.4} fadeOut={2} />
          <Sfx name="gull" at={3.2} volume={0.45} />
          <Sfx name="whoosh_soft" at={seg('s1a') + 1.6} volume={0.35} />
          <Sfx name="whoosh_soft" at={seg('s1a') + 3.1} volume={0.3} />
          <Sfx name="whoosh" at={seg('s1b') + 0.1} volume={0.45} />
          <Sfx name="gull" at={seg('s1c') + 0.6} volume={0.5} rate={1.1} />
          <Sfx name="wood_creak" at={seg('s1c') + 1.8} volume={0.45} />
          <Sfx name="footsteps" at={seg('s1c') + 3.8} volume={0.45} />
          <Sfx name="pop" at={seg('s1a') + 0.6} volume={0.5} />
          <Sfx name="whoosh" at={tRealise + 0.1} volume={0.4} />
          <Sfx name="glitch" at={t2026} volume={0.55} />
          <Sfx name="impact" at={t1650} volume={0.9} />
          <Sfx name="heartbeat" at={t1650 + 0.3} volume={0.6} dur={4} fadeOut={1.2} />
          <Sfx name="whoosh_long" at={tTitle} volume={0.5} />
          <Sfx name="pop" at={tTitle + 0.85} volume={0.5} />
          <Sfx name="whoosh" at={30.7} volume={0.6} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);

/** Screen-space kinetic typography: "2026" gets struck out, "1650!" slams in. */
const YearSlam: React.FC<{t: number}> = ({t}) => {
  const a = t2026 - 0.15;
  const b = t1650;
  const end = seg('s1d', 'end') + 0.3;
  if (t < a || t > end + 0.4) return null;
  const pIn = prog(t, a, 0.35, 'outBack');
  const strike = prog(t, a + 0.5, 0.3, 'outCubic');
  const slam = prog(t, b, 0.35, 'outBack');
  const out = prog(t, end, 0.35, 'inBack');
  const shake = t > b && t < b + 0.3 ? Math.sin(t * 90) * 8 * (1 - (t - b) / 0.3) : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 1290,
          top: 230,
          transform: `scale(${pIn * (1 - out)}) rotate(-6deg) translateY(${slam * 40}px)`,
          opacity: 1 - slam * 0.55,
          fontFamily: FONT_TITLE,
          fontWeight: 800,
          fontSize: 150,
          color: '#fff',
          WebkitTextStroke: '8px #1b2130',
          paintOrder: 'stroke',
        }}
      >
        2026
        <div style={{position: 'absolute', left: -10, top: 98, height: 22, width: `${strike * 105}%`, background: C.red, borderRadius: 11, transform: 'rotate(-8deg)'}} />
      </div>
      {t >= b && (
        <div
          style={{
            position: 'absolute',
            left: 1270 + shake,
            top: 400,
            transform: `scale(${(2.4 - slam * 1.4) * (1 - out)}) rotate(4deg)`,
            opacity: Math.min(1, slam * 2),
            fontFamily: FONT_TITLE,
            fontWeight: 800,
            fontSize: 190,
            color: C.yellow,
            WebkitTextStroke: '10px #1b2130',
            paintOrder: 'stroke',
            textShadow: '0 10px 0 rgba(0,0,0,0.35)',
          }}
        >
          1650!
        </div>
      )}
    </AbsoluteFill>
  );
};
