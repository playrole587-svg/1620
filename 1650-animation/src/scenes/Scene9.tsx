// Scene 9 — Terbangun dari Mimpi: back in a 2026 bedroom. No reference image exists for this scene,
// so the room is drawn entirely as original vector art around the same rigged character.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Key, sample, seg, word, prog, rand} from '../animations/keyframes';
import {Boy, BoyPose} from '../components/Boy';
import {C, FONT_BODY, FONT_TITLE} from '../components/Typography';
import {ShockLines, Particles, HighlightBox, Mark} from '../components/Graphics';
import {Sfx, Music} from '../components/AudioKit';
import {SceneShell} from '../components/Transitions';

const S = 's9';
const tJolt = 1.35;
const tClockOff = 2.6;
const tFace = seg('s9b') - 0.3;
const tPhone = word('s9b', 'HP');
const t2026 = word('s9b', '2026');
const tRelief = seg('s9c') + 0.3;
const tAsk = seg('s9d');
const tEnd = 25.03;

// screen-space camera (the room is designed at 1920x1080)
export const camera: Key[] = [
  {t: 0, x: 620, y: 600, zoom: 1.55},
  {t: tJolt, x: 620, y: 600, zoom: 1.55},
  {t: tJolt + 0.25, x: 660, y: 520, zoom: 1.45, ease: 'outBack'},
  {t: tClockOff - 0.4, x: 900, y: 560, zoom: 1.35, ease: 'inOutCubic'},
  {t: seg('s9a') + 0.5, x: 700, y: 520, zoom: 1.5, ease: 'inOutCubic'},
  {t: tPhone - 0.3, x: 720, y: 540, zoom: 1.45, ease: 'inOutSine'},
  {t: tPhone + 0.4, x: 1100, y: 640, zoom: 1.55, ease: 'inOutCubic'}, // phone on nightstand
  {t: t2026 + 0.2, x: 900, y: 420, zoom: 1.4, ease: 'inOutCubic'}, // calendar
  {t: tRelief - 0.4, x: 700, y: 520, zoom: 1.5, ease: 'inOutCubic'},
  {t: tAsk, x: 720, y: 520, zoom: 1.42, ease: 'linear'},
  {t: tEnd - 2, x: 960, y: 540, zoom: 1.0, ease: 'inOutSine'}, // slow pull back
  {t: tEnd, x: 960, y: 540, zoom: 0.98, ease: 'linear'},
];

const base: BoyPose = {x: 640, y: 770, scale: 0.8, sit: 1, pack: 0, legFH: 86, legBH: 84, legFK: 4, legBK: 0, breathRate: 1.5, handF: 'open', handB: 'open'};

export const boyTrack: Key[] = [
  {t: 0, lean: -78, eyeOpen: 0, mouth: 'wavy', mouthOpen: 0.5, sweat: 1, eyeWide: 0, headTilt: 6, armFS: -10, armFE: 10, armBS: -10, armBE: 10, breathe: 1, brow: 1, lookX: 0, lookY: 0, eyeSquint: 0, headFlip: 1, pale: 0},
  {t: 0.6, headTilt: -8, ease: 'inOutSine'},
  {t: 1.0, headTilt: 8, ease: 'inOutSine'},
  {t: tJolt - 0.05, lean: -78, eyeOpen: 0, headTilt: 0},
  {t: tJolt + 0.3, lean: 6, eyeOpen: 1, eyeWide: 1, mouth: 'shout', mouthOpen: 1, armFS: 60, armFE: 40, armBS: 50, armBE: 40, breathe: 5, pale: 1, ease: 'outBack'},
  {t: tClockOff - 0.5, lean: 10, armFS: 95, armFE: 5, handF: 'open', lookX: 1, ease: 'inOutCubic'}, // reach for the clock
  {t: tClockOff + 0.3, lean: 2, armFS: 20, armFE: 30, ease: 'inOutCubic'},
  {t: seg('s9a'), mouth: 'open', mouthOpen: 0.6, breathe: 5, eyeWide: 0.8, pale: 0.5},
  {t: tFace, armFS: 20, armFE: 30, armBS: 50, armBE: 40, lookX: 0},
  {t: tFace + 0.6, armFS: 158, armFE: 132, armBS: 150, armBE: 128, headTilt: 4, eyeWide: 1, mouth: 'o', breathe: 3.5, ease: 'inOutCubic'}, // hands touch the face
  {t: tPhone - 0.4, armFS: 158, armFE: 132, armBS: 150, armBE: 128},
  {t: tPhone, armFS: 30, armFE: 40, armBS: 40, armBE: 40, lookX: 1, headFlip: 1, mouth: 'o', ease: 'inOutCubic'},
  {t: t2026, lookY: -0.6, headTilt: -8},
  {t: tRelief - 0.2, eyeWide: 0.6, mouth: 'o', eyeSquint: 0, breathe: 2.5, pale: 0, sweat: 0.6},
  {t: tRelief + 0.5, eyeSquint: 1, mouth: 'smile', lean: -6, headTilt: -10, breathe: 1, sweat: 0.2, brow: 0, lookY: 0, ease: 'outCubic'}, // relief sigh
  {t: tAsk, eyeSquint: 0, eyeWide: 0, mouth: 'smile', lean: 0, headTilt: 4, lookX: -0.4, armFS: 10, armFE: 20},
  {t: tAsk + 2.5, mouth: 'closed', headTilt: -6, lookX: -0.8, brow: -0.4},
  {t: tEnd, mouth: 'smile'},
];

const Room: React.FC<{t: number}> = ({t}) => {
  const sun = 0.35 + 0.65 * prog(t, tRelief - 1, 4, 'inOutSine');
  const curtain = Math.sin(t * 0.9) * 8;
  const ring = t > 0.85 && t < tClockOff ? Math.sin(t * 80) * 6 : 0;
  const phoneOn = t > tPhone - 0.2;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id="wall9" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9c4dc" />
          <stop offset="1" stopColor="#c9d9e6" />
        </linearGradient>
        <linearGradient id="sky9" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc6f2" />
          <stop offset="1" stopColor="#ffe3a8" />
        </linearGradient>
        <linearGradient id="beam9" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2c6" stopOpacity={0.75} />
          <stop offset="1" stopColor="#fff2c6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="floor9" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08d5e" />
          <stop offset="1" stopColor="#8f633d" />
        </linearGradient>
      </defs>
      {/* wall + floor */}
      <rect x={-600} y={-400} width={3100} height={1340} fill="url(#wall9)" />
      <rect x={-600} y={930} width={3100} height={600} fill="url(#floor9)" />
      <rect x={-600} y={918} width={3100} height={18} fill="#f4efe6" />
      {/* shelf with books */}
      <rect x={140} y={250} width={300} height={16} rx={4} fill="#8a5b36" />
      {['#e05d4a', '#f2b33d', '#4f86c6', '#59a86b', '#8e6fc1'].map((c, i) => (
        <rect key={i} x={160 + i * 34} y={250 - 70 - (i % 2) * 14} width={28} height={70 + (i % 2) * 14} rx={3} fill={c} stroke="#2b2b33" strokeWidth={3} />
      ))}
      <circle cx={380} cy={222} r={26} fill="#6fbf73" stroke="#2b2b33" strokeWidth={3} />
      <rect x={366} y={222} width={28} height={28} fill="#c96b3b" stroke="#2b2b33" strokeWidth={3} />
      {/* calendar 2026 */}
      <g transform="translate(760 170)">
        <rect width={220} height={250} rx={10} fill="#fff" stroke="#2b2b33" strokeWidth={4} />
        <rect width={220} height={70} rx={10} fill="#e2363b" />
        <rect y={56} width={220} height={14} fill="#e2363b" />
        <text x={110} y={50} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={800} fontSize={42} fill="#fff">
          2026
        </text>
        {Array.from({length: 28}).map((_, i) => (
          <rect key={i} x={18 + (i % 7) * 28} y={92 + Math.floor(i / 7) * 36} width={18} height={18} rx={3} fill={i === 19 ? '#e2363b' : '#d7dde5'} />
        ))}
      </g>
      {/* window */}
      <g transform="translate(1290 140)">
        <rect x={-14} y={-14} width={468} height={468} rx={12} fill="#f4efe6" stroke="#2b2b33" strokeWidth={5} />
        <rect width={440} height={440} fill="url(#sky9)" />
        <circle cx={330} cy={330} r={60} fill="#fff1b8" opacity={0.9} />
        <path d="M 0 360 Q 80 320 160 350 T 320 340 T 440 360 L 440 440 L 0 440 Z" fill="#9cc79a" />
        <path d="M 40 250 l 40 -50 l 40 50 Z M 260 260 l 50 -70 l 50 70 Z" fill="#7fb07e" />
        <path d="M 220 0 L 220 440 M 0 220 L 440 220" stroke="#f4efe6" strokeWidth={16} />
        {/* birds */}
        {[0, 1].map((k) => {
          const bx = ((t * (40 + k * 15) + k * 200) % 520) - 40;
          const f = Math.sin(t * 10 + k) * 5;
          return <path key={k} d={`M ${bx - 10} ${80 + k * 40 - f} Q ${bx - 4} ${74 + k * 40} ${bx} ${80 + k * 40} Q ${bx + 4} ${74 + k * 40} ${bx + 10} ${80 + k * 40 - f}`} fill="none" stroke="#3a3a44" strokeWidth={3} strokeLinecap="round" />;
        })}
      </g>
      {/* curtains */}
      <path d={`M 1240 110 L 1350 110 Q ${1330 + curtain} 380 ${1360 + curtain} 640 L 1230 650 Z`} fill="#f7d775" stroke="#2b2b33" strokeWidth={4} />
      <path d={`M 1700 110 L 1810 110 L 1820 650 L ${1690 - curtain} 640 Q ${1720 - curtain} 380 1700 110 Z`} fill="#f7d775" stroke="#2b2b33" strokeWidth={4} />
      <rect x={1220} y={96} width={610} height={18} rx={9} fill="#8a5b36" />
      {/* sunbeam */}
      <path d="M 1320 160 L 1720 160 L 980 1000 L 200 1000 Z" fill="url(#beam9)" opacity={0.45 * sun} />
      {/* nightstand */}
      <g transform="translate(1180 690)">
        <rect width={240} height={240} rx={8} fill="#b07a4a" stroke="#2b2b33" strokeWidth={5} />
        <rect x={20} y={70} width={200} height={70} rx={6} fill="#9c6a3e" stroke="#2b2b33" strokeWidth={4} />
        <circle cx={120} cy={105} r={8} fill="#f4efe6" stroke="#2b2b33" strokeWidth={3} />
        {/* phone */}
        <g transform="translate(150 -14) rotate(-8)">
          <rect x={-46} y={-12} width={92} height={22} rx={8} fill="#1d2029" stroke="#0e0f14" strokeWidth={3} />
          {phoneOn && <rect x={-40} y={-8} width={80} height={13} rx={5} fill="#9fd0ff" opacity={0.6 + 0.4 * Math.sin(t * 3)} />}
        </g>
        {/* alarm clock */}
        <g transform={`translate(60 ${-58}) rotate(${ring})`}>
          <circle cx={-26} cy={-50} r={18} fill="#ffcf4d" stroke="#2b2b33" strokeWidth={4} />
          <circle cx={26} cy={-50} r={18} fill="#ffcf4d" stroke="#2b2b33" strokeWidth={4} />
          <circle r={50} fill="#e2363b" stroke="#2b2b33" strokeWidth={5} />
          <circle r={38} fill="#fff" stroke="#2b2b33" strokeWidth={3} />
          <path d="M 0 0 L 0 -26 M 0 0 L 18 8" stroke="#2b2b33" strokeWidth={5} strokeLinecap="round" />
          <path d="M -30 42 L -40 58 M 30 42 L 40 58" stroke="#2b2b33" strokeWidth={6} strokeLinecap="round" />
        </g>
      </g>
      {/* bed */}
      <rect x={110} y={560} width={60} height={420} rx={14} fill="#8a5b36" stroke="#2b2b33" strokeWidth={5} />
      <rect x={110} y={520} width={60} height={60} rx={30} fill="#8a5b36" stroke="#2b2b33" strokeWidth={5} />
      <rect x={140} y={760} width={1010} height={120} rx={20} fill="#f4efe6" stroke="#2b2b33" strokeWidth={5} />
      <rect x={150} y={870} width={990} height={60} rx={10} fill="#8a5b36" stroke="#2b2b33" strokeWidth={5} />
      <rect x={1110} y={680} width={50} height={300} rx={14} fill="#8a5b36" stroke="#2b2b33" strokeWidth={5} />
      {/* pillow */}
      <path d="M 170 700 Q 160 660 210 655 L 380 650 Q 430 652 425 700 Q 430 750 380 752 L 210 760 Q 160 752 170 700 Z" fill="#ffffff" stroke="#2b2b33" strokeWidth={5} />
    </svg>
  );
};

/** Blanket drawn over the boy's legs. */
const Blanket: React.FC<{t: number; up: number}> = ({t, up}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    <path
      d={`M ${520 - up * 40} ${742 - up * 10} Q ${700} ${700 + Math.sin(t * 1.5) * 4} 880 710 Q 1060 700 1140 740 L 1170 900 Q 820 930 ${480 - up * 30} 905 Z`}
      fill="#5b8bd0"
      stroke="#2b2b33"
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <path d={`M ${560 - up * 30} 790 Q 800 760 1120 790`} fill="none" stroke="#7fa8e0" strokeWidth={10} strokeLinecap="round" />
    {Array.from({length: 7}).map((_, i) => (
      <circle key={i} cx={640 + i * 75} cy={840 + (i % 2) * 22} r={9} fill="#f7d775" opacity={0.85} />
    ))}
  </svg>
);

export const Scene9: React.FC = () => (
  <SceneShell id={S} enter="dream" exit="dip">
    {(t, frame) => {
      const cam = sample<{x: number; y: number; zoom: number}>(camera, t);
      const tr = sample<Partial<BoyPose>>(boyTrack, t);
      const pant = t > tJolt && t < tRelief ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.5) : 1;
      const pose: BoyPose = {...base, ...tr, mouthOpen: (tr.mouthOpen ?? 1) * pant};
      const shake = t > tJolt && t < tJolt + 0.4 ? (1 - (t - tJolt) / 0.4) * 10 : 0;
      const light = 0.55 + 0.45 * prog(t, tRelief - 1, 4, 'inOutSine');
      const up = Math.min(1, Math.max(0, ((tr.lean ?? -78) + 78) / 84));
      return (
        <AbsoluteFill>
          <AbsoluteFill
            style={{
              transformOrigin: '0 0',
              transform: `translate(960px, 540px) scale(${cam.zoom}) translate(${-cam.x + Math.sin(t * 60) * shake}px, ${-cam.y}px)`,
            }}
          >
            <Room t={t} />
            <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <Boy pose={pose} frame={frame} />
              <ShockLines t={t} t0={tJolt + 0.1} out={seg('s9a') + 2} x={500} y={250} rot={-30} scale={1.2} />
              <ShockLines t={t} t0={tJolt + 0.15} out={seg('s9a') + 2} x={820} y={250} rot={30} scale={1.2} />
              <HighlightBox t={t} t0={t2026 - 0.2} out={t2026 + 2.2} x={748} y={158} w={244} h={274} />
              <HighlightBox t={t} t0={tPhone} out={tPhone + 2.0} x={1270} y={640} w={130} h={60} r={14} />
            </svg>
            <Blanket t={t} up={up} />
            <AbsoluteFill style={{background: '#1c2340', opacity: (1 - light) * 0.9}} />
            <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <Particles t={t} n={30} x={500} y={200} w={1200} h={700} kind="dust" seed={19} opacity={0.7 * light} />
              {t > 0.85 && t < tClockOff + 0.2 && (
                <g transform={`translate(${1320 + Math.sin(t * 50) * 4} 520) rotate(-8) scale(${prog(t, 0.85, 0.3, 'outBack')})`}>
                  <text textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={800} fontSize={64} fill={C.yellow} stroke="#1b2130" strokeWidth={10} paintOrder="stroke">
                    KRIIING!
                  </text>
                </g>
              )}
              <Mark t={t} t0={tFace + 0.4} out={tRelief} x={560} y={300} ch="?" size={100} color={C.red} />
            </svg>
          </AbsoluteFill>
          <PhoneScreen t={t} />
          <DreamBubble t={t} />
          <EndCard t={t} />
          {/* ---- sound ---- */}
          <Sfx name="alarm" at={0.85} volume={0.75} dur={tClockOff - 0.85} fadeOut={0.05} />
          <Sfx name="gasp" at={tJolt} volume={0.7} />
          <Sfx name="impact_soft" at={tJolt} volume={0.6} />
          <Sfx name="click" at={tClockOff} volume={0.6} />
          <Sfx name="breathing" at={tJolt + 0.2} volume={0.55} dur={tRelief - tJolt} fadeOut={1.5} />
          <Sfx name="heartbeat" at={tJolt} volume={0.5} dur={6} fadeOut={2} />
          <Sfx name="cloth" at={tFace} volume={0.5} />
          <Sfx name="ding" at={tPhone} volume={0.4} />
          <Sfx name="swish" at={t2026 - 0.2} volume={0.4} />
          <Sfx name="sigh" at={tRelief} volume={0.6} />
          <Sfx name="birds" at={tRelief - 0.5} volume={0.45} dur={tEnd - tRelief + 0.5} fadeOut={2} />
          <Music name="m_morning" sceneStart={0} dur={tEnd} volume={0.45} fadeIn={3} fadeOut={1.5} offset={0} />
          <Sfx name="pop" at={tAsk + 3.0} volume={0.4} />
          <Sfx name="chime" at={tEnd - 4} volume={0.5} />
        </AbsoluteFill>
      );
    }}
  </SceneShell>
);

/** Close-up of the phone lock screen: 2026. */
const PhoneScreen: React.FC<{t: number}> = ({t}) => {
  const a = tPhone + 0.2;
  const b = t2026 + 0.1;
  const s = prog(t, a, 0.4, 'outBack') * (1 - prog(t, b, 0.3, 'inBack'));
  if (s <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 170,
        top: 150,
        width: 300,
        height: 580,
        transform: `scale(${s}) rotate(4deg)`,
        borderRadius: 44,
        background: '#1d2029',
        border: '7px solid #0e0f14',
        padding: 14,
        boxSizing: 'border-box',
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{width: '100%', height: '100%', borderRadius: 30, background: 'linear-gradient(160deg,#ffb36b,#e46b8f 55%,#5a5fc8)', color: '#fff', textAlign: 'center', fontFamily: FONT_BODY, paddingTop: 80, boxSizing: 'border-box'}}>
        <div style={{fontWeight: 700, fontSize: 24, opacity: 0.9}}>Rabu, 21 Oktober</div>
        <div style={{fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 92, lineHeight: 1.1}}>06:30</div>
        <div style={{marginTop: 30, fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 64, color: C.yellow, textShadow: '0 4px 0 rgba(0,0,0,0.25)'}}>2026</div>
        <div style={{marginTop: 40, fontWeight: 800, fontSize: 22}}>📶 Sinyal penuh · Wi-Fi ✓</div>
      </div>
    </div>
  );
};

/** Thought bubble with the 1650 harbour fading away = "it was only a dream". */
const DreamBubble: React.FC<{t: number}> = ({t}) => {
  const a = seg('s9c') - 0.2;
  const b = seg('s9c', 'end') + 0.6;
  const s = prog(t, a, 0.5, 'outBack');
  const pop = prog(t, b, 0.35, 'inBack');
  if (s <= 0 || pop >= 1) return null;
  const fade = 1 - pop;
  return (
    <div style={{position: 'absolute', left: 1010, top: 110, transform: `scale(${s * (1 + pop * 0.3)})`, opacity: fade}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: -60 - i * 50, top: 330 + i * 60, width: 40 - i * 10, height: 40 - i * 10, borderRadius: '50%', background: '#fff', border: '4px solid #2b2b33'}} />
      ))}
      <div style={{width: 520, height: 340, borderRadius: '50%', background: '#fff', border: '6px solid #2b2b33', overflow: 'hidden', position: 'relative'}}>
        <Img src={staticFile('references/scene01.png')} style={{position: 'absolute', left: -60, top: -40, width: 640, height: 430, filter: `sepia(0.5) blur(${1 + prog(t, a + 1.5, 1.5) * 3}px)`, opacity: 1 - prog(t, a + 1.8, 1.2) * 0.6}} />
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 70, color: '#fff', WebkitTextStroke: '6px #1b2130', paintOrder: 'stroke'}}>1650</div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 280, padding: '10px 26px', borderRadius: 30, background: C.navy, color: C.yellow, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 36, transform: `scale(${prog(t, a + 1.2, 0.4, 'outBack')})`}}>
        Cuma mimpi…?
      </div>
    </div>
  );
};

/** Closing card. */
const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = tAsk + 3.0;
  const s = prog(t, a, 0.6, 'outBack');
  if (s <= 0) return null;
  const words = ['Apakah', 'kamu', 'berani?'];
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', transform: `scale(${s})`}}>
      <div style={{display: 'inline-block', background: C.navy, borderRadius: 30, padding: '18px 44px 22px', boxShadow: '0 16px 30px rgba(0,0,0,0.3)'}}>
        <div style={{fontFamily: FONT_BODY, fontWeight: 800, fontSize: 34, color: '#fff', opacity: 0.9}}>Kalau bisa kembali ke tahun 1650…</div>
        <div style={{fontFamily: FONT_TITLE, fontWeight: 800, fontSize: 84, color: C.yellow, lineHeight: 1.15}}>
          {words.map((w, i) => {
            const p = prog(t, a + 0.3 + i * 0.18, 0.4, 'outBack');
            return (
              <span key={i} style={{display: 'inline-block', margin: '0 12px', transform: `translateY(${(1 - p) * 30}px) scale(${p})`}}>
                {w}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{marginTop: 18, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: '#1b2130', opacity: prog(t, a + 1.4, 0.6)}}>
        Apa Terjadi Jika Kita Terbangun di Tahun 1650?
      </div>
      {/* confetti sparkle */}
      <svg width={1920} height={300} style={{position: 'absolute', left: 0, top: -40}}>
        {Array.from({length: 20}).map((_, i) => {
          const life = Math.min(1, Math.max(0, (t - a - 0.2) / 2));
          const x = 960 + (rand(i) - 0.5) * 1200 * life;
          const y = 120 + (rand(i + 9) - 0.6) * 260 * life + life * life * 120;
          return <circle key={i} cx={x} cy={y} r={6} fill={['#ffd36b', '#e2363b', '#5b8bd0', '#59a86b'][i % 4]} opacity={1 - life} />;
        })}
      </svg>
    </div>
  );
};
