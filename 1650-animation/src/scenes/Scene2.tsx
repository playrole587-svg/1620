// Scene 2 — Tidak Ada Teknologi Modern: no signal, no internet, the modern icons get crossed out.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Key, sample, seg, word, prog} from '../animations/keyframes';
import {Stage, Layer, Plate, PlateSvg, Cutout, idle, Cam, HoleOutline, cropInfo} from '../components/Stage';
import {Boy, BoyPose} from '../components/Boy';
import {TitleBox, InfoBox, C, FONT_BODY, FONT_TITLE} from '../components/Typography';
import {Mark, RedX, Particles, Grade, Cloud, PlateImg} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's2';

// icon order follows the narration: HP, internet, listrik(=headphones/electric), komputer, kendaraan.., hiburan
const ICONS: {name: string; at: number}[] = [
  {name: 'phone', at: word('s2c', 'HP')},
  {name: 'wifi', at: word('s2c', 'internet')},
  {name: 'headphones', at: word('s2c', 'listrik')},
  {name: 'laptop', at: word('s2c', 'komputer')},
  {name: 'camera', at: word('s2c', 'kendaraan')},
  {name: 'gamepad', at: word('s2c', 'hiburan')},
];

export const camera: Key[] = [
  {t: 0, x: 520, y: 330, zoom: 1.32},
  {t: seg('s2a', 'end'), x: 500, y: 360, zoom: 1.34, ease: 'inOutSine'},
  {t: seg('s2b') - 0.3, x: 500, y: 560, zoom: 1.38, ease: 'inOutSine'},
  {t: seg('s2b') + 0.6, x: 470, y: 640, zoom: 1.7, ease: 'inOutCubic'}, // close on the phone
  {t: seg('s2c') - 0.2, x: 480, y: 630, zoom: 1.72, ease: 'linear'},
  {t: seg('s2c') + 0.7, x: 1170, y: 430, zoom: 1.6, ease: 'inOutCubic'}, // the icon board
  {t: seg('s2d') - 0.3, x: 1180, y: 450, zoom: 1.66, ease: 'linear'},
  {t: seg('s2d') + 0.9, x: 860, y: 640, zoom: 1.18, ease: 'inOutCubic'}, // market + info box
  {t: 27.8, x: 820, y: 620, zoom: 1.24, ease: 'linear'},
];

const base: BoyPose = {x: 380, y: 1483, scale: 1.12, bodyScale: 1.35, armFS: 6, armFE: 12, armBS: -4, armBE: 10};

export const boyTrack: Key[] = [
  {t: 0, mouth: 'o', mouthOpen: 0.6, lookX: 0.6, lookY: 0, headTilt: 0, eyeWide: 0.3, sweat: 0, brow: 0, armFS: 6, armFE: 12, phoneGlow: 0},
  {t: seg('s2b') - 0.1, armFS: 6, armFE: 12},
  {t: seg('s2b') + 0.5, armFS: 30, armFE: 95, lookY: 0.7, headTilt: 12, mouth: 'closed', phoneGlow: 1, ease: 'outBack'}, // phone up
  {t: word('s2b', 'tidak') , mouth: 'o', eyeWide: 0.6, brow: 1},
  {t: word('s2b', 'internet'), sweat: 1, mouth: 'wavy', phoneGlow: 0},
  {t: seg('s2b', 'end') + 0.2, armFS: 30, armFE: 95, headTilt: 12, lookY: 0.7},
  {t: seg('s2c') + 0.3, armFS: 8, armFE: 14, headTilt: -2, lookY: -0.2, lookX: 1, mouth: 'open', mouthOpen: 0.5, eyeWide: 0.8, brow: 1},
  {t: seg('s2d'), mouth: 'o', eyeWide: 0.3, sweat: 0.6, brow: 0.5},
  {t: 27.8, mouth: 'o'},
];

export const Scene2: React.FC = () => (
  <SceneShell id={S} enter="whip" exit="whip">
    {(t, frame) => {
      const cam = sample<Cam>(camera, t);
      const pose = {...base, ...sample<Partial<BoyPose>>(boyTrack, t), props: 'phone'};
      return (
        <AbsoluteFill>
          <Stage cam={cam} t={t}>
            <Plate scene="scene02" skyDrift={t * 3} />
            <Layer depth={0.5}>
              <PlateSvg>
                <Cloud x={120 + t * 8} y={90} s={1} />
                <Cloud x={700 + t * 6} y={30} s={0.8} />
              </PlateSvg>
            </Layer>
            <Layer>
              <Cutout scene="scene02" name="woman" anim={{...idle(t, 4), rot: Math.sin(t * 0.9) * 0.8}} />
              <Cutout scene="scene02" name="hatman" anim={{...idle(t, 5), dy: Math.sin(t * 1.3) * 1.5}} />
              {/* icons re-appear on the notice board, then get crossed out */}
              {ICONS.map((ic, i) => {
                const c = cropInfo('scene02', ic.name);
                const p = prog(t, ic.at - 0.35, 0.4, 'outBack');
                const shake = t > ic.at + 0.25 && t < ic.at + 0.6 ? Math.sin(t * 70) * 4 : 0;
                const fade = prog(t, ic.at + 0.4, 0.5);
                return (
                  <div
                    key={ic.name}
                    style={{
                      position: 'absolute',
                      left: c.x,
                      top: c.y,
                      width: c.w,
                      height: c.h,
                      transform: `translateX(${shake}px) scale(${p})`,
                      filter: `grayscale(${fade * 0.8}) brightness(${1 - fade * 0.15})`,
                      opacity: p > 0 ? 1 : 0,
                    }}
                  >
                    <PlateImg src={c.src} x={0} y={0} w={c.w} h={c.h} style={{mixBlendMode: 'multiply'}} />
                  </div>
                );
              })}
              <PlateSvg>
                {ICONS.map((ic, i) => {
                  const c = cropInfo('scene02', ic.name);
                  return <RedX key={i} t={t} t0={ic.at + 0.2} x={c.x + c.w / 2} y={c.y + c.h / 2 + 10} size={Math.min(c.w, c.h) * 0.62} />;
                })}
                <Boy pose={pose} frame={frame} />
                <HoleOutline scene="scene02" />
                <Mark t={t} t0={word('s2b', 'internet') - 0.1} x={610} y={370} ch="!" size={120} />
                <TitleBox t={t} t0={0.12} x={48} y={36} w={908} h={240} lines={['Tidak Ada', 'Teknologi Modern']} num="2" size={80} seed={21} />
                <InfoBox
                  t={t}
                  t0={0.5}
                  read0={seg('s2c')}
                  read1={seg('s2d', 'end')}
                  x={762}
                  y={640}
                  w={668}
                  h={308}
                  size={25}
                  lines={[
                    'Di tahun 1650, tidak ada HP, internet,',
                    'listrik, komputer, kendaraan modern,',
                    'atau hiburan seperti sekarang.',
                    'Untuk mendapatkan informasi, orang',
                    'datang langsung ke pasar, mendengar',
                    'berita dari orang lain, atau membaca',
                    'pengumuman di tempat umum.',
                  ]}
                  keywords={['HP', 'internet', 'listrik', 'komputer', 'kendaraan', 'hiburan', 'pasar', 'berita', 'pengumuman']}
                />
              </PlateSvg>
            </Layer>
            <Layer depth={1.2}>
              <PlateSvg>
                <Particles t={t} n={22} x={0} y={250} w={1536} h={700} kind="dust" seed={12} opacity={0.7} />
              </PlateSvg>
            </Layer>
            <Grade vignette={0.4} tint="#ffd59a" tintOpacity={0.1} />
          </Stage>
          <PhonePopup t={t} />
          <Music name="m_curious" sceneStart={0} dur={27.75} volume={0.4} offset={0} />
          <Sfx name="market_amb" at={0} volume={0.45} dur={27.7} fadeOut={1.5} />
          <Sfx name="whoosh" at={0} volume={0.5} />
          <Sfx name="pop" at={0.3} volume={0.45} />
          <Sfx name="cloth" at={seg('s2b') + 0.1} volume={0.6} />
          <Sfx name="phone_search" at={seg('s2b') + 0.7} volume={0.55} />
          <Sfx name="error" at={word('s2b', 'internet')} volume={0.6} />
          <Sfx name="whoosh" at={seg('s2c') + 0.2} volume={0.45} />
          {ICONS.map((ic, i) => (
            <React.Fragment key={i}>
              <Sfx name="pop" at={ic.at - 0.35} volume={0.4} rate={1 + i * 0.05} />
              <Sfx name="xmark" at={ic.at + 0.2} volume={0.5} />
            </React.Fragment>
          ))}
          <Sfx name="bell" at={seg('s2d') + 1.5} volume={0.35} />
          <Sfx name="whoosh" at={27.5} volume={0.55} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);

/** Screen-space phone UI: searching for signal -> "Tidak ada sinyal". */
const PhonePopup: React.FC<{t: number}> = ({t}) => {
  const a = seg('s2b') + 0.6;
  const b = seg('s2b', 'end') + 0.25;
  if (t < a - 0.1 || t > b + 0.5) return null;
  const pin = prog(t, a, 0.45, 'outBack');
  const pout = prog(t, b, 0.35, 'inBack');
  const s = pin * (1 - pout);
  const failed = t > word('s2b', 'sinyal');
  const noNet = t > word('s2b', 'internet');
  const spin = (t * 360) % 360;
  return (
    <div
      style={{
        position: 'absolute',
        left: 1180,
        top: 140,
        width: 330,
        height: 640,
        transform: `scale(${s}) rotate(${(1 - pin) * 12 + Math.sin(t * 2) * 1.5}deg)`,
        borderRadius: 46,
        background: '#1d2029',
        border: '7px solid #0e0f14',
        boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{width: '100%', height: '100%', borderRadius: 32, background: failed ? 'linear-gradient(#2a3448,#141822)' : 'linear-gradient(#3b6fb5,#24426e)', position: 'relative', overflow: 'hidden', fontFamily: FONT_BODY, color: '#fff'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '14px 20px', fontWeight: 800, fontSize: 22}}>
          <span>06:30</span>
          <span style={{display: 'flex', gap: 3, alignItems: 'flex-end'}}>
            {[8, 13, 18, 23].map((h, i) => (
              <span key={i} style={{width: 6, height: h, borderRadius: 2, background: failed ? 'rgba(255,255,255,0.25)' : i < ((t * 3) % 4) ? '#fff' : 'rgba(255,255,255,0.3)'}} />
            ))}
            {failed && <span style={{color: C.red, marginLeft: 4, fontSize: 22}}>✕</span>}
          </span>
        </div>
        <div style={{position: 'absolute', top: 170, left: 0, right: 0, textAlign: 'center'}}>
          {!failed ? (
            <>
              <div style={{width: 80, height: 80, margin: '0 auto', borderRadius: '50%', border: '9px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', transform: `rotate(${spin}deg)`}} />
              <div style={{marginTop: 26, fontWeight: 800, fontSize: 30}}>Mencari sinyal…</div>
            </>
          ) : (
            <>
              <div style={{fontFamily: FONT_TITLE, fontSize: 110, fontWeight: 800, color: C.red, lineHeight: 1}}>✕</div>
              <div style={{marginTop: 16, fontWeight: 800, fontSize: 32}}>Tidak ada sinyal</div>
              {noNet && <div style={{marginTop: 10, fontWeight: 700, fontSize: 26, opacity: 0.85}}>Tidak ada internet</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
