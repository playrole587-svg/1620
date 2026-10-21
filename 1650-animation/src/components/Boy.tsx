// Rigged SVG version of the main character (black messy hair, white T-shirt, black backpack,
// black trousers), drawn to match the reference illustrations. Forward-kinematics rig:
// root -> hips -> torso -> neck/head, shoulders -> upper arm -> forearm -> hand,
// hips -> thigh -> shin -> shoe. Every joint is a numeric prop so it can be keyframed.
//
// Coordinates: origin at the feet (ground), +y down, character faces RIGHT (facing=-1 mirrors).
// At scale 1 the figure is ~940 units tall (head ~300 units).

import React from 'react';
import {rand, noise1} from '../animations/keyframes';

export type MouthShape = 'closed' | 'smile' | 'o' | 'open' | 'shout' | 'grit' | 'wavy' | 'flat';

export type BoyPose = {
  x: number;
  y: number;
  scale: number;
  facing?: number; // 1 right, -1 left
  rot?: number; // whole-body rotation (deg)
  lean?: number; // torso lean (deg, + = forward)
  bob?: number; // vertical body offset
  breathe?: number; // amplitude of breathing (1 = idle)
  breathRate?: number; // breaths per second
  // head
  headTilt?: number; // deg
  headTurn?: number; // -1 (toward viewer) .. 1 (full profile); scaleX of head for turn-arounds
  headFlip?: number; // 1 normal, -1 looking back (animated through 0 = cartoon head-turn)
  lookX?: number; // pupil offset -1..1
  lookY?: number;
  // face
  eyeOpen?: number; // 0 closed .. 1 open (auto blink multiplies)
  eyeWide?: number; // 0 normal .. 1 shocked (bigger eyes)
  eyeSquint?: number; // 0..1 happy/strain squint (arc eyes)
  brow?: number; // -1 angry .. 0 none .. 1 worried
  mouth?: MouthShape;
  mouthOpen?: number; // 0..1 (scales open shapes, for talking)
  sweat?: number; // 0..1 visibility
  blush?: number;
  pale?: number; // 0..1 blue-ish shade on forehead (fear)
  // arms: shoulder angle (deg, 0 = hanging down, + = forward/up toward facing side), elbow bend (deg)
  armFS?: number;
  armFE?: number;
  armBS?: number;
  armBE?: number;
  handF?: 'fist' | 'open' | 'point' | 'grip';
  handB?: 'fist' | 'open' | 'point' | 'grip';
  // legs: hip angle (deg, + = forward), knee bend (deg, + = bends backward)
  legFH?: number;
  legFK?: number;
  legBH?: number;
  legBK?: number;
  walk?: number; // walk cycle phase (cycles); if walkAmt > 0 drives legs/arms
  walkAmt?: number; // 0..1
  sit?: number; // 0..1: body lowered to the ground with legs forward
  props?: string; // comma list: phone,map,coin,sack,pouch
  phoneGlow?: number;
  bodyScale?: number; // perspective: body bigger/smaller relative to the head
  pack?: number; // 1 = wearing the backpack, 0 = no backpack (bedroom)
};

const OUT = '#211a1d';
const SKIN = '#fbd9c2';
const SKIN_SH = '#efbfa3';
const HAIR = '#1f1b21';
const HAIR_HI = '#3b3743';
const SHIRT = '#f6f4f0';
const SHIRT_SH = '#dedbd6';
const PANTS = '#222027';
const PACK = '#26252b';
const PACK_HI = '#3a3941';
const SW = 7; // outline width

const rad = (d: number) => (d * Math.PI) / 180;

// ---- hair (hand-drawn paths, head-local coords; origin = neck pivot) -----------
const HAIR_BACK =
  'M -112 -58 C -140 -80 -160 -110 -158 -140 L -194 -150 C -176 -170 -170 -190 -172 -206 ' +
  'L -212 -224 C -186 -242 -176 -262 -168 -282 L -192 -322 C -150 -318 -118 -334 -92 -344 ' +
  'L -96 -386 C -64 -362 -34 -362 -6 -364 L 14 -398 C 34 -366 66 -360 94 -346 L 136 -364 ' +
  'C 134 -330 148 -306 162 -284 L 190 -280 C 176 -258 170 -238 166 -218 L 150 -190 L -60 -170 Z';

// bangs: chunky pointed locks over the forehead, tips above the eye
const BANGS =
  'M -70 -250 C 0 -300 120 -290 172 -228 L 166 -200 C 158 -186 154 -172 150 -156 ' +
  'C 140 -172 130 -180 120 -186 C 116 -170 108 -158 98 -148 C 96 -168 90 -182 80 -192 ' +
  'C 70 -174 58 -164 42 -156 C 46 -176 44 -192 36 -204 C 22 -186 4 -176 -16 -170 ' +
  'C -8 -190 -10 -206 -18 -218 C -36 -204 -52 -198 -70 -196 Z';

// back tuft covering the nape behind the ear
const NAPE = 'M -150 -150 Q -162 -96 -122 -44 Q -116 -72 -98 -64 Q -104 -98 -84 -112 L -60 -200 Z';

const FACE =
  'M -100 -176 C -108 -110 -88 -50 -40 -24 C -4 -6 42 -4 82 -18 C 122 -34 150 -74 152 -120 ' +
  'C 154 -162 146 -204 128 -236 L -80 -250 Z';

function Mouth({shape, open}: {shape: MouthShape; open: number}) {
  const o = Math.max(0.05, open);
  switch (shape) {
    case 'smile':
      return <path d="M 74 -66 Q 96 -46 116 -64" fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" />;
    case 'flat':
      return <path d="M 80 -60 L 112 -62" fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" />;
    case 'wavy':
      return (
        <path d="M 76 -60 q 7 -7 14 0 q 7 7 14 0 q 7 -7 12 0" fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" />
      );
    case 'grit':
      return (
        <g>
          <rect x={76} y={-74} width={40} height={20 * (0.6 + o * 0.4)} rx={8} fill="#fff" stroke={OUT} strokeWidth={5} />
          <path d={`M 76 ${-74 + 10 * (0.6 + o * 0.4)} L 116 ${-74 + 10 * (0.6 + o * 0.4)}`} stroke={OUT} strokeWidth={3} />
        </g>
      );
    case 'o': {
      const r = 9 + 6 * o;
      return (
        <g>
          <ellipse cx={98} cy={-62} rx={r * 0.85} ry={r} fill="#8a2a36" stroke={OUT} strokeWidth={5} />
        </g>
      );
    }
    case 'open':
    case 'shout': {
      const h = (shape === 'shout' ? 40 : 30) * (0.45 + 0.55 * o);
      const w = shape === 'shout' ? 30 : 24;
      const cy = -66;
      return (
        <g>
          <path
            d={`M ${98 - w} ${cy - h * 0.35} Q ${98} ${cy - h * 0.55} ${98 + w * 0.9} ${cy - h * 0.4} Q ${98 + w} ${cy + h * 0.6} ${98} ${cy + h * 0.62} Q ${98 - w * 1.05} ${cy + h * 0.5} ${98 - w} ${cy - h * 0.35} Z`}
            fill="#7d2331"
            stroke={OUT}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <path
            d={`M ${98 - w * 0.7} ${cy + h * 0.42} Q ${98 - 2} ${cy + h * 0.05} ${98 + w * 0.7} ${cy + h * 0.4} Q ${98} ${cy + h * 0.6} ${98 - w * 0.7} ${cy + h * 0.42} Z`}
            fill="#e5737b"
          />
        </g>
      );
    }
    default:
      return <path d="M 84 -60 Q 96 -56 108 -61" fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" />;
  }
}

function Head(p: Required<Pick<BoyPose, 'lookX' | 'lookY' | 'eyeOpen' | 'eyeWide' | 'eyeSquint' | 'brow' | 'mouth' | 'mouthOpen' | 'sweat' | 'blush' | 'pale' | 'headTurn'>> & {frame: number}) {
  const turn = p.headTurn; // shifts facial features
  const fx = turn * 10;
  const eyeX = 80 + fx;
  const eyeY = -116;
  const ew = 15 * (1 + p.eyeWide * 0.25);
  const eh = 25 * (1 + p.eyeWide * 0.22);
  const open = Math.max(0, Math.min(1, p.eyeOpen));
  const px = p.lookX * 3.5;
  const py = p.lookY * 4;
  const sweatPhase = (p.frame % 90) / 90;
  return (
    <g>
      {/* nape/back hair behind face */}
      <path d={NAPE} fill={HAIR} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      {/* ear */}
      <g transform={`translate(${-62 - fx * 0.8} -112)`}>
        <ellipse rx={24} ry={30} fill={SKIN} stroke={OUT} strokeWidth={SW} />
        <path d="M 4 -14 Q -10 -6 -2 6 Q 6 12 0 18" fill="none" stroke={SKIN_SH} strokeWidth={5} strokeLinecap="round" />
      </g>
      {/* face */}
      <path d={FACE} fill={SKIN} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      {/* cheek shade near jaw */}
      <path d="M -60 -60 C -40 -36 0 -24 40 -26 C 10 -34 -30 -44 -60 -60 Z" fill={SKIN_SH} opacity={0.55} />
      {p.pale > 0 && (
        <g opacity={0.75 * p.pale} stroke="#4b6aa8" strokeWidth={4.5} strokeLinecap="round">
          {[20, 42, 64, 86, 108].map((x, i) => (
            <path key={i} d={`M ${x + fx} -176 L ${x + fx} ${-150 + (i % 2) * 8}`} />
          ))}
        </g>
      )}
      {p.blush > 0 && <ellipse cx={62 + fx} cy={-70} rx={20} ry={9} fill="#ff8c8c" opacity={0.45 * p.blush} />}
      {/* eye */}
      <g transform={`translate(${eyeX} ${eyeY})`}>
        {p.eyeSquint > 0.5 ? (
          <path d={`M ${-ew} 4 Q 0 ${-eh * 0.8} ${ew} 4`} fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />
        ) : (
          <g>
            <g transform={`scale(1 ${Math.max(0.08, open)})`}>
              <ellipse cx={0} cy={0} rx={ew} ry={eh} fill="#1a1417" />
              <circle cx={-5 + px} cy={-9 + py} r={5.5} fill="#fff" />
              <circle cx={5 + px} cy={8 + py} r={2.6} fill="#fff" opacity={0.9} />
            </g>
            {open < 0.25 && <path d={`M ${-ew - 2} 1 Q 0 6 ${ew + 2} 1`} fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />}
          </g>
        )}
      </g>
      {/* nose */}
      <path d={`M ${136 + fx * 0.6} -112 q 9 6 1 13`} fill="none" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" />
      {/* mouth */}
      <g transform={`translate(${-4 + fx * 0.7} 2) scale(1.12)`}>
        <Mouth shape={p.mouth} open={p.mouthOpen} />
      </g>
      {/* sweat drop */}
      {p.sweat > 0.01 && (
        <g transform={`translate(${40 + fx * 0.5} ${-96 + sweatPhase * 16}) scale(${p.sweat})`} opacity={Math.min(1, p.sweat * 1.5) * (1 - sweatPhase * 0.4)}>
          <path d="M 0 -16 C 6 -6 11 2 11 8 A 11 11 0 0 1 -11 8 C -11 2 -6 -6 0 -16 Z" fill="#bfe6fb" stroke={OUT} strokeWidth={3.5} />
          <circle cx={-3} cy={7} r={2.5} fill="#fff" />
        </g>
      )}
      {/* hair mass + bangs (outline pass, then fill pass => single merged silhouette) */}
      <g>
        <path d={HAIR_BACK} fill={HAIR} stroke={OUT} strokeWidth={SW * 2} strokeLinejoin="round" />
        <path d={BANGS} fill={HAIR} stroke={OUT} strokeWidth={SW * 2} strokeLinejoin="round" />
        <path d={HAIR_BACK} fill={HAIR} />
        <path d={BANGS} fill={HAIR} />
        {/* subtle sheen strands */}
        <path d="M -60 -318 Q 0 -340 60 -322" fill="none" stroke={HAIR_HI} strokeWidth={9} strokeLinecap="round" opacity={0.75} />
        <path d="M -130 -220 Q -120 -270 -80 -296" fill="none" stroke={HAIR_HI} strokeWidth={7} strokeLinecap="round" opacity={0.55} />
        <path d="M 20 -250 Q 60 -262 110 -236" fill="none" stroke={HAIR_HI} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
      </g>
      {/* brows peeking under bangs */}
      {Math.abs(p.brow) > 0.05 && (
        <path
          d={`M ${eyeX - 18} ${-152 + (p.brow > 0 ? -6 : 4) * Math.abs(p.brow)} L ${eyeX + 16} ${-152 + (p.brow > 0 ? 6 : -6) * Math.abs(p.brow)}`}
          stroke={OUT}
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

// ---- limbs -----------------------------------------------------------------
type Pt = [number, number];
const fk = (o: Pt, len: number, angDeg: number): Pt => {
  // angle 0 = straight down, positive = rotate toward +x (forward)
  const a = rad(angDeg);
  return [o[0] + Math.sin(a) * len, o[1] + Math.cos(a) * len];
};

function Hand({at, kind, ang}: {at: Pt; kind: string; ang: number}) {
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${-ang})`}>
      {kind === 'open' ? (
        <g>
          {[-15, -5, 5, 15].map((fx, i) => (
            <path key={i} d={`M ${fx} 8 L ${fx * 1.25} ${34 - Math.abs(fx) * 0.35}`} stroke={OUT} strokeWidth={15} strokeLinecap="round" />
          ))}
          <path d="M 18 -2 L 32 14" stroke={OUT} strokeWidth={15} strokeLinecap="round" />
          <circle r={21} fill={SKIN} stroke={OUT} strokeWidth={SW} />
          {[-15, -5, 5, 15].map((fx, i) => (
            <path key={i} d={`M ${fx} 8 L ${fx * 1.25} ${34 - Math.abs(fx) * 0.35}`} stroke={SKIN} strokeWidth={7.5} strokeLinecap="round" />
          ))}
          <path d="M 18 -2 L 32 14" stroke={SKIN} strokeWidth={7.5} strokeLinecap="round" />
        </g>
      ) : kind === 'point' ? (
        <g>
          <circle r={22} fill={SKIN} stroke={OUT} strokeWidth={SW} />
          <path d="M 8 6 L 10 44" stroke={OUT} strokeWidth={17} strokeLinecap="round" />
          <path d="M 8 6 L 10 44" stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <path d="M -22 -10 Q -26 18 -4 24 Q 20 28 24 6 Q 26 -14 6 -18 Q -14 -20 -22 -10 Z" fill={SKIN} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M -6 2 Q 4 0 12 4 M -8 12 Q 4 10 14 14" fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

function Arm({shoulder, sAng, eAng, hand, shade}: {shoulder: Pt; sAng: number; eAng: number; hand: string; shade?: boolean}) {
  const elbow = fk(shoulder, 88, sAng);
  const sleeveEnd = fk(shoulder, 54, sAng);
  const wrist = fk(elbow, 80, sAng + eAng);
  const skin = shade ? SKIN_SH : SKIN;
  const shirt = shade ? SHIRT_SH : SHIRT;
  const line = (a: Pt, b: Pt, w: number, c: string) => (
    <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />
  );
  return (
    <g>
      {/* outline pass */}
      {line(elbow, wrist, 46 + SW * 2, OUT)}
      {line(shoulder, elbow, 48 + SW * 2, OUT)}
      {/* fill pass */}
      {line(elbow, wrist, 46, skin)}
      {line(shoulder, elbow, 48, skin)}
      {/* short sleeve */}
      {line(shoulder, sleeveEnd, 64 + SW * 2, OUT)}
      {line(shoulder, sleeveEnd, 64, shirt)}
      <Hand at={fk(wrist, 14, sAng + eAng)} kind={hand} ang={sAng + eAng} />
    </g>
  );
}

function Leg({hip, hAng, kAng, shade}: {hip: Pt; hAng: number; kAng: number; shade?: boolean}) {
  const knee = fk(hip, 128, hAng);
  const ankle = fk(knee, 118, hAng - kAng);
  const c = shade ? '#18171c' : PANTS;
  const shoeAng = hAng - kAng;
  return (
    <g>
      <path d={`M ${hip[0]} ${hip[1]} L ${knee[0]} ${knee[1]} L ${ankle[0]} ${ankle[1]}`} stroke={OUT} strokeWidth={78 + SW * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M ${hip[0]} ${hip[1]} L ${knee[0]} ${knee[1]} L ${ankle[0]} ${ankle[1]}`} stroke={c} strokeWidth={78} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g transform={`translate(${ankle[0]} ${ankle[1]}) rotate(${-shoeAng * 0.6})`}>
        <path d="M -38 -14 Q -40 26 -10 30 L 58 30 Q 72 26 64 8 Q 50 -8 18 -16 Z" fill="#2e2c33" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M -36 22 L 66 22" stroke="#e9e6e1" strokeWidth={7} strokeLinecap="round" />
      </g>
    </g>
  );
}

// ---- props -----------------------------------------------------------------
const Phone = ({glow}: {glow: number}) => (
  <g>
    <rect x={-26} y={-48} width={52} height={92} rx={10} fill="#2b2f3a" stroke={OUT} strokeWidth={6} />
    <rect x={-20} y={-40} width={40} height={74} rx={5} fill={glow > 0.5 ? '#bfe0ff' : '#3b4a66'} opacity={0.6 + glow * 0.4} />
  </g>
);

const Coin = () => (
  <g>
    <circle r={16} fill="#e8b649" stroke={OUT} strokeWidth={5} />
    <circle r={9} fill="none" stroke="#b9852a" strokeWidth={3} />
  </g>
);

const Sack = () => (
  <g>
    <path d="M -190 -60 C -230 -170 -110 -250 20 -210 C 120 -180 150 -90 110 -20 C 60 50 -150 50 -190 -60 Z" fill="#a08867" stroke={OUT} strokeWidth={SW} />
    <path d="M -150 -80 C -120 -40 -40 -20 40 -40" fill="none" stroke="#7d6648" strokeWidth={6} strokeLinecap="round" />
    <path d="M -60 -200 C -40 -170 0 -160 40 -170" fill="none" stroke="#7d6648" strokeWidth={6} strokeLinecap="round" />
    <path d="M 100 -150 Q 130 -170 150 -150 Q 140 -130 115 -128 Z" fill="#8c7555" stroke={OUT} strokeWidth={5} />
  </g>
);

const MapProp = () => (
  <g>
    <path d="M -140 -100 L -40 -116 L 50 -96 L 150 -112 L 160 70 L 60 86 L -30 66 L -130 82 Z" fill="#d9bf8c" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
    <path d="M -40 -116 L -30 66 M 50 -96 L 60 86" stroke="#b39260" strokeWidth={4} />
    <path d="M -110 -40 Q -60 -70 -20 -30 T 80 -20 T 130 20" fill="none" stroke="#8a6a3c" strokeWidth={4} strokeDasharray="10 8" />
    <circle cx={100} cy={-50} r={10} fill="none" stroke="#a5402f" strokeWidth={4} />
    <path d="M -100 20 l 30 10 l 20 -20 l 30 15" fill="none" stroke="#7c9a6a" strokeWidth={5} />
  </g>
);

// ---- main ------------------------------------------------------------------
export const Boy: React.FC<{pose: BoyPose; frame: number; fps?: number}> = ({pose, frame, fps = 60}) => {
  const p = {
    facing: 1,
    rot: 0,
    lean: 0,
    bob: 0,
    breathe: 1,
    breathRate: 0.28,
    headTilt: 0,
    headTurn: 0,
    headFlip: 1,
    lookX: 0,
    lookY: 0,
    eyeOpen: 1,
    eyeWide: 0,
    eyeSquint: 0,
    brow: 0,
    mouth: 'closed' as MouthShape,
    mouthOpen: 1,
    sweat: 0,
    blush: 0,
    pale: 0,
    armFS: 8,
    armFE: 10,
    armBS: -6,
    armBE: 10,
    handF: 'fist' as const,
    handB: 'fist' as const,
    legFH: 4,
    legFK: 0,
    legBH: -4,
    legBK: 0,
    walk: 0,
    walkAmt: 0,
    sit: 0,
    props: '',
    phoneGlow: 0,
    bodyScale: 1,
    pack: 1,
    ...pose,
  };
  const t = frame / fps;

  // automatic blink: every 2.6–4.6 s, 7 frames
  let blink = 1;
  {
    let k = 0;
    let at = 0.8;
    while (at < t + 1 && k < 400) {
      if (t >= at && t < at + 0.12) {
        const x = (t - at) / 0.12;
        blink = Math.abs(1 - 2 * x);
      }
      at += 2.6 + rand(k * 3.1 + 5) * 2;
      k++;
    }
  }

  // walk cycle
  const w = p.walkAmt;
  const ph = p.walk * Math.PI * 2;
  const legF = p.legFH + w * 28 * Math.sin(ph);
  const legB = p.legBH - w * 28 * Math.sin(ph);
  const kneeF = p.legFK + w * Math.max(0, -Math.sin(ph + 0.6)) * 40;
  const kneeB = p.legBK + w * Math.max(0, Math.sin(ph + 0.6)) * 40;
  const armF = p.armFS - w * 22 * Math.sin(ph);
  const armB = p.armBS + w * 22 * Math.sin(ph);
  const walkBob = -w * Math.abs(Math.cos(ph)) * 14;

  const breath = Math.sin(t * Math.PI * 2 * p.breathRate) * p.breathe;
  const sitDrop = p.sit * 236; // hips go down to the ground
  const hip: Pt = [0, -270 + sitDrop];
  const torsoTop = -500 + sitDrop;
  const props = p.props.split(',').map((s) => s.trim());

  // torso/head group transform (lean around hips)
  const torsoT = `rotate(${p.lean} ${hip[0]} ${hip[1]})`;
  const neck: Pt = [6, torsoTop - 8];
  const shF: Pt = [62, torsoTop + 28];
  const shB: Pt = [-66, torsoTop + 24];

  const headT = `translate(${neck[0]} ${neck[1] - breath * 2.5}) rotate(${p.headTilt + noise1(t * 0.6, 3) * 1.2 * p.breathe}) scale(${(p.headFlip * 0.92) / p.bodyScale} ${0.92 / p.bodyScale})`;

  return (
    <g transform={`translate(${p.x} ${p.y + p.bob + walkBob}) rotate(${p.rot}) scale(${p.scale * p.bodyScale * p.facing} ${p.scale * p.bodyScale})`}>
      {/* contact shadow */}
      <ellipse cx={p.sit * 60} cy={6} rx={150 + p.sit * 120} ry={22} fill="#000" opacity={0.22} />

      {/* back leg */}
      <Leg hip={[hip[0] - 22, hip[1]]} hAng={legB} kAng={kneeB} shade />
      {/* front leg (torso hem overlaps its top) */}
      <Leg hip={[hip[0] + 30, hip[1]]} hAng={legF} kAng={kneeF} />

      <g transform={torsoT}>
        {/* back arm (behind body) */}
        <Arm shoulder={shB} sAng={armB} eAng={p.armBE} hand={p.handB} shade />
        {/* backpack */}
        {p.pack > 0 && (
        <g transform={`translate(${-124 - p.sit * 40} ${torsoTop + 34 - breath + p.sit * 30}) scale(${1 + p.sit * 0.45})`}>
          <rect x={-58} y={-14} width={112} height={200} rx={34} fill={PACK} stroke={OUT} strokeWidth={SW} />
          <rect x={-46} y={100} width={86} height={64} rx={18} fill={PACK_HI} stroke={OUT} strokeWidth={5} />
          <path d="M -40 30 Q 0 20 40 30" stroke={PACK_HI} strokeWidth={6} fill="none" />
        </g>
        )}
        {props.includes('sack') && (
          <g transform={`translate(${-70} ${torsoTop + 40}) rotate(-12) scale(1.1)`}>
            <Sack />
          </g>
        )}
        {/* torso */}
        <g transform={`translate(0 ${-breath * 1.2}) scale(1 ${1 + breath * 0.008})`}>
          <path
            d={`M -98 ${torsoTop + 22} Q -20 ${torsoTop - 12} 94 ${torsoTop + 18} Q 112 ${torsoTop + 120} 102 ${hip[1] + 4} Q 0 ${hip[1] + 22} -100 ${hip[1] + 2} Q -114 ${torsoTop + 120} -98 ${torsoTop + 22} Z`}
            fill={SHIRT}
            stroke={OUT}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d={`M -78 ${torsoTop + 56} Q -94 ${torsoTop + 140} -86 ${hip[1] - 6} L -56 ${hip[1]} Q -66 ${torsoTop + 130} -78 ${torsoTop + 56} Z`} fill={SHIRT_SH} />
          {/* V neck */}
          <path d={`M -8 ${torsoTop + 2} L 22 ${torsoTop + 46} L 52 ${torsoTop + 6}`} fill={SKIN} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
          {/* belt line / pants top */}
          <path d={`M -92 ${hip[1] + 2} Q 0 ${hip[1] + 24} 96 ${hip[1] + 4} L 92 ${hip[1] + 30} Q 0 ${hip[1] + 50} -90 ${hip[1] + 30} Z`} fill={PANTS} stroke={OUT} strokeWidth={SW} />
          {p.pack > 0 && (
            <g>
          <path d={`M -48 ${torsoTop + 6} Q -42 ${torsoTop + 100} -54 ${torsoTop + 180}`} stroke={OUT} strokeWidth={30} fill="none" strokeLinecap="round" />
          <path d={`M -48 ${torsoTop + 6} Q -42 ${torsoTop + 100} -54 ${torsoTop + 180}`} stroke={PACK} strokeWidth={18} fill="none" strokeLinecap="round" />
          <path d={`M 62 ${torsoTop + 14} Q 72 ${torsoTop + 100} 64 ${torsoTop + 185}`} stroke={OUT} strokeWidth={30} fill="none" strokeLinecap="round" />
          <path d={`M 62 ${torsoTop + 14} Q 72 ${torsoTop + 100} 64 ${torsoTop + 185}`} stroke={PACK} strokeWidth={18} fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
        {/* neck */}
        <rect x={-12} y={torsoTop - 34} width={42} height={40} fill={SKIN_SH} />

        {/* head */}
        <g transform={headT}>
          <Head
            frame={frame}
            lookX={p.lookX}
            lookY={p.lookY}
            eyeOpen={p.eyeOpen * blink}
            eyeWide={p.eyeWide}
            eyeSquint={p.eyeSquint}
            brow={p.brow}
            mouth={p.mouth}
            mouthOpen={p.mouthOpen}
            sweat={p.sweat}
            blush={p.blush}
            pale={p.pale}
            headTurn={p.headTurn}
          />
        </g>

        {props.includes('map') && (
          <g transform={`translate(${fk(fk(fk(shF, 88, armF), 80, armF + p.armFE), 20, armF + p.armFE).join(' ')}) rotate(${-8 + Math.sin(t * 0.8) * 2}) translate(-70 40)`}>
            <MapProp />
          </g>
        )}
        {/* front arm */}
        <Arm shoulder={shF} sAng={armF} eAng={p.armFE} hand={p.handF} />
        {props.includes('phone') && (
          <g transform={`translate(${fk(fk(fk(shF, 88, armF), 80, armF + p.armFE), 26, armF + p.armFE).join(' ')}) rotate(${-(armF + p.armFE) + 180})`}>
            <Phone glow={p.phoneGlow} />
          </g>
        )}
        {props.includes('coin') && (
          <g transform={`translate(${fk(fk(fk(shF, 88, armF), 80, armF + p.armFE), 36, armF + p.armFE).join(' ')})`}>
            <Coin />
          </g>
        )}
      </g>
    </g>
  );
};
