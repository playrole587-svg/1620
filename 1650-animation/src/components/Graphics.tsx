// Educational motion-graphics primitives (all SVG, plate or screen coordinates).

import React from 'react';
import {Img} from 'remotion';
import {prog, rand, noise1, ease} from '../animations/keyframes';
import {C, FONT_BODY, FONT_TITLE} from './Typography';
import {asset} from './Stage';

/** Floating "?" / "!" mark with pop-in, bob and outline. */
export const Mark: React.FC<{t: number; t0: number; x: number; y: number; ch: '?' | '!'; size?: number; color?: string; out?: number; seed?: number}> = ({
  t,
  t0,
  x,
  y,
  ch,
  size = 110,
  color,
  out,
  seed = 1,
}) => {
  const p = prog(t, t0, 0.45, 'outElastic');
  const e = out !== undefined ? prog(t, out, 0.3, 'inBack') : 0;
  const s = p * (1 - e);
  if (s <= 0.001) return null;
  const bob = Math.sin((t - t0) * 3 + seed) * 8;
  const wob = Math.sin((t - t0) * 2.2 + seed) * 7;
  const fill = color ?? (ch === '!' ? C.red : '#fff');
  return (
    <g transform={`translate(${x} ${y + bob}) rotate(${wob}) scale(${s})`}>
      <text
        textAnchor="middle"
        y={size * 0.35}
        fontFamily={FONT_TITLE}
        fontWeight={800}
        fontSize={size}
        fill={fill}
        stroke="#fff"
        strokeWidth={ch === '!' ? 10 : 0}
        paintOrder="stroke"
        style={{filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.35))'}}
      >
        {ch}
      </text>
      {ch === '?' && (
        <text textAnchor="middle" y={size * 0.35} fontFamily={FONT_TITLE} fontWeight={800} fontSize={size} fill="none" stroke={color ? '#fff' : '#1f2430'} strokeWidth={4}>
          ?
        </text>
      )}
    </g>
  );
};

/** Red manga "shock" lines (///). */
export const ShockLines: React.FC<{t: number; t0: number; x: number; y: number; rot?: number; scale?: number; color?: string; out?: number}> = ({t, t0, x, y, rot = -30, scale = 1, color = C.red, out}) => {
  const p = prog(t, t0, 0.25, 'outBack') * (out !== undefined ? 1 - prog(t, out, 0.25, 'inBack') : 1);
  if (p <= 0) return null;
  const jit = Math.sin(t * 40) * 2 * (t - t0 < 0.6 ? 1 : 0.2);
  return (
    <g transform={`translate(${x + jit} ${y}) rotate(${rot}) scale(${scale * p})`}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={i * 26 - 26} y={-30 + Math.abs(i - 1) * 8} width={13} height={58 - Math.abs(i - 1) * 12} rx={6} fill={color} stroke="#fff" strokeWidth={3} />
      ))}
    </g>
  );
};

/** Comic speech bubble with tail, optional flag, typewriter text. */
export const Bubble: React.FC<{
  t: number;
  t0: number;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  tail: [number, number]; // tail tip relative to bubble centre
  size?: number;
  flag?: 'nl';
  out?: number;
}> = ({t, t0, x, y, w, h, text, tail, size = 40, flag, out}) => {
  const p = prog(t, t0, 0.4, 'outBack');
  const e = out !== undefined ? prog(t, out, 0.3, 'inBack') : 0;
  const s = p * (1 - e);
  if (s <= 0.001) return null;
  const chars = Math.floor(Math.max(0, (t - t0 - 0.15) * 22));
  const shown = text.slice(0, chars);
  const [tx, ty] = tail;
  const lines = shown.split('\n');
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M ${-w * 0.18} ${h * 0.3} L ${tx} ${ty} L ${w * 0.08} ${h * 0.4} Z`} fill="#fff" stroke="#1d1d22" strokeWidth={5} strokeLinejoin="round" />
      <ellipse rx={w / 2} ry={h / 2} fill="#fff" stroke="#1d1d22" strokeWidth={5} />
      <path d={`M ${-w * 0.16} ${h * 0.28} L ${tx * 0.6} ${ty * 0.6} L ${w * 0.06} ${h * 0.36} Z`} fill="#fff" />
      {lines.map((l, i) => (
        <text key={i} textAnchor="middle" y={(flag ? -h * 0.1 : size * 0.35) + (i - (lines.length - 1) / 2) * size * 1.1} fontFamily={FONT_BODY} fontWeight={800} fontSize={size} fill="#1f2430">
          {l}
        </text>
      ))}
      {flag === 'nl' && chars >= text.length && (
        <g transform={`translate(-30 ${h * 0.14})`}>
          <rect width={60} height={14} fill="#ae1c28" />
          <rect y={14} width={60} height={14} fill="#fff" />
          <rect y={28} width={60} height={14} fill="#21468b" />
          <rect width={60} height={42} fill="none" stroke="#333" strokeWidth={2} />
        </g>
      )}
    </g>
  );
};

/** Hand-drawn arrow that draws itself along a quadratic curve. */
export const Arrow: React.FC<{t: number; t0: number; from: [number, number]; to: [number, number]; bend?: number; color?: string; width?: number; out?: number}> = ({
  t,
  t0,
  from,
  to,
  bend = 0.25,
  color = C.yellow,
  width = 12,
  out,
}) => {
  const p = prog(t, t0, 0.5, 'outCubic');
  const e = out !== undefined ? 1 - prog(t, out, 0.3) : 1;
  if (p <= 0 || e <= 0) return null;
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend;
  const my = (y0 + y1) / 2 + (x1 - x0) * bend;
  const len = Math.hypot(x1 - x0, y1 - y0) * 1.15;
  const ang = (Math.atan2(y1 - my, x1 - mx) * 180) / Math.PI;
  return (
    <g opacity={e}>
      <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none" stroke="#1d1d22" strokeWidth={width + 8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      {p > 0.9 && (
        <g transform={`translate(${x1} ${y1}) rotate(${ang}) scale(${ease.outBack((p - 0.9) * 10)})`}>
          <path d="M 8 0 L -26 -20 L -18 0 L -26 20 Z" fill={color} stroke="#1d1d22" strokeWidth={5} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

/** Dashed highlight box that draws on. */
export const HighlightBox: React.FC<{t: number; t0: number; x: number; y: number; w: number; h: number; color?: string; out?: number; r?: number}> = ({t, t0, x, y, w, h, color = C.yellow, out, r = 18}) => {
  const p = prog(t, t0, 0.6, 'inOutCubic');
  const e = out !== undefined ? 1 - prog(t, out, 0.3) : 1;
  if (p <= 0 || e <= 0) return null;
  const per = 2 * (w + h);
  const pulse = 1 + Math.sin((t - t0) * 6) * 0.015;
  return (
    <g opacity={e} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${pulse}) translate(${-w / 2} ${-h / 2})`}>
      <rect width={w} height={h} rx={r} fill="none" stroke="#1d1d22" strokeWidth={13} strokeDasharray={per} strokeDashoffset={per * (1 - p)} opacity={0.6} />
      <rect width={w} height={h} rx={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={per} strokeDashoffset={per * (1 - p)} />
    </g>
  );
};

/** Big red X that draws on (two strokes). */
export const RedX: React.FC<{t: number; t0: number; x: number; y: number; size: number}> = ({t, t0, x, y, size}) => {
  const a = prog(t, t0, 0.18, 'outCubic');
  const b = prog(t, t0 + 0.14, 0.18, 'outCubic');
  if (a <= 0) return null;
  const L = size * 1.42;
  const s = size / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      {[
        [a, `M ${-s} ${-s} L ${s} ${s}`],
        [b, `M ${s} ${-s} L ${-s} ${s}`],
      ].map(([v, d], i) => (
        <g key={i}>
          <path d={d as string} stroke="#fff" strokeWidth={size * 0.2} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - (v as number))} />
          <path d={d as string} stroke={C.red} strokeWidth={size * 0.13} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - (v as number))} />
        </g>
      ))}
    </g>
  );
};

/** Floating dust motes / embers / flies. */
export const Particles: React.FC<{
  t: number;
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'dust' | 'ember' | 'fly' | 'sparkle' | 'snow';
  seed?: number;
  opacity?: number;
}> = ({t, n, x, y, w, h, kind = 'dust', seed = 1, opacity = 1}) => {
  const items = [];
  for (let i = 0; i < n; i++) {
    const r0 = rand(seed * 31 + i);
    const r1 = rand(seed * 17 + i * 3.3);
    const r2 = rand(seed * 7 + i * 9.1);
    let px = x + r0 * w;
    let py = y + r1 * h;
    let size = 2 + r2 * 4;
    let op = 0.5;
    let fill = '#fff6d8';
    if (kind === 'dust') {
      px += noise1(t * 0.3 + i, seed) * 40 + t * 6;
      py += noise1(t * 0.25 + i * 2, seed + 1) * 30 - t * 3;
      op = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + i));
    } else if (kind === 'ember') {
      const life = (t * (0.25 + r2 * 0.2) + r0) % 1;
      py = y + h - life * h;
      px += Math.sin(t * 2 + i) * 20;
      op = Math.sin(life * Math.PI) * 0.9;
      fill = r2 > 0.5 ? '#ffb347' : '#ff6a2a';
      size = 2 + r2 * 3;
    } else if (kind === 'fly') {
      px += Math.sin(t * (5 + r2 * 4) + i) * 30 + noise1(t * 2 + i, seed) * 40;
      py += Math.cos(t * (6 + r0 * 3) + i * 2) * 20 + noise1(t * 2.3 + i, seed + 5) * 25;
      fill = '#151214';
      size = 3 + r2 * 2;
      op = 0.85;
    } else if (kind === 'sparkle') {
      const tw = Math.max(0, Math.sin(t * (2 + r2 * 3) + i * 1.7));
      op = Math.pow(tw, 6);
      size = 3 + r2 * 6;
    }
    items.push(
      kind === 'sparkle' ? (
        <g key={i} transform={`translate(${px} ${py}) scale(${size / 6})`} opacity={op * opacity}>
          <path d="M 0 -8 L 1.6 -1.6 L 8 0 L 1.6 1.6 L 0 8 L -1.6 1.6 L -8 0 L -1.6 -1.6 Z" fill="#fff" />
        </g>
      ) : (
        <circle key={i} cx={px} cy={py} r={size} fill={fill} opacity={op * opacity} />
      ),
    );
  }
  return <g>{items}</g>;
};

/** Soft god-rays from a point (use with mixBlendMode screen in a plate layer). */
export const Rays: React.FC<{t: number; x: number; y: number; len?: number; n?: number; opacity?: number; color?: string; spread?: number; dir?: number}> = ({
  t,
  x,
  y,
  len = 1400,
  n = 7,
  opacity = 0.18,
  color = '#fff3c4',
  spread = 50,
  dir = 120,
}) => (
  <g>
    <defs>
      <linearGradient id={`ray-${x}-${y}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={color} stopOpacity={1} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
    {Array.from({length: n}).map((_, i) => {
      const a = dir - spread / 2 + (spread * i) / (n - 1) + Math.sin(t * 0.4 + i) * 1.5;
      const wdt = 30 + rand(i + 3) * 60;
      const op = opacity * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.3));
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`} opacity={op}>
          <path d={`M 0 0 L ${len} ${-wdt} L ${len} ${wdt} Z`} fill={`url(#ray-${x}-${y})`} />
        </g>
      );
    })}
  </g>
);

/** Cartoon cloud drifting across the sky. */
export const Cloud: React.FC<{x: number; y: number; s?: number; opacity?: number}> = ({x, y, s = 1, opacity = 0.95}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <path d="M -90 20 C -120 20 -120 -16 -88 -18 C -86 -50 -40 -60 -20 -36 C -6 -70 50 -66 56 -28 C 88 -40 112 -10 96 20 Z" fill="#fff" />
    <path d="M -90 20 C -60 10 40 12 96 20 Z" fill="#d9e6f5" />
  </g>
);

/** Seagull silhouette with flapping wings. */
export const Gull: React.FC<{x: number; y: number; t: number; s?: number; seed?: number}> = ({x, y, t, s = 1, seed = 0}) => {
  const f = Math.sin(t * 9 + seed) * 0.6;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M -30 ${-10 * f} Q -14 ${-14 - 10 * f} 0 0 Q 14 ${-14 - 10 * f} 30 ${-10 * f}`} fill="none" stroke="#f7f7f7" strokeWidth={5} strokeLinecap="round" />
      <path d={`M -30 ${-10 * f} Q -14 ${-14 - 10 * f} 0 0 Q 14 ${-14 - 10 * f} 30 ${-10 * f}`} fill="none" stroke="#3a3a44" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
    </g>
  );
};

/** Waving tricolour flag (Dutch Republic / VOC "prinsenvlag" style red-white-blue). */
export const Flag: React.FC<{x: number; y: number; w: number; h: number; t: number; seed?: number; colors?: string[]}> = ({
  x,
  y,
  w,
  h,
  t,
  seed = 0,
  colors = ['#c4222e', '#f4f4f4', '#24418f'],
}) => {
  const N = 12;
  const band = (k: number) => {
    const top: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const wave = Math.sin(u * 5 - t * 6 + seed) * 7 * u + Math.sin(u * 9 - t * 9 + seed) * 2 * u;
      const sag = u * u * 6;
      const xx = u * w;
      top.push(`${xx.toFixed(1)} ${(((k * h) / 3) + wave + sag * (k / 3)).toFixed(1)}`);
      bot.push(`${xx.toFixed(1)} ${((((k + 1) * h) / 3) + wave + sag * ((k + 1) / 3)).toFixed(1)}`);
    }
    return `M ${top.join(' L ')} L ${bot.reverse().join(' L ')} Z`;
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      {colors.map((c, k) => (
        <path key={k} d={band(k)} fill={c} stroke="rgba(0,0,0,0.25)" strokeWidth={0.8} />
      ))}
      {/* shading folds */}
      {Array.from({length: N}).map((_, i) => {
        const u = i / N;
        const sh = Math.cos(u * 5 - t * 6 + seed);
        return sh > 0.4 ? <rect key={i} x={u * w} y={-4} width={w / N} height={h + 12} fill="#000" opacity={0.08 * sh} /> : null;
      })}
    </g>
  );
};

/** Image card (crop from reference) with caption, pops in. HTML (inside a plate Layer) so the
 * image load is tracked by Remotion. */
export const ImageCard: React.FC<{
  t: number;
  t0: number;
  x: number;
  y: number;
  w: number;
  imgH: number;
  src: string; // asset path relative to assets/
  title: string;
  body: string;
  round?: boolean;
  out?: number;
  titleBg?: string;
  bodySize?: number;
  focus?: number; // 0..1 emphasis
  icon?: React.ReactNode; // rendered instead of an image
}> = ({t, t0, x, y, w, imgH, src, title, body, round, out, titleBg, bodySize = 19, focus = 0, icon}) => {
  const p = prog(t, t0, 0.5, 'outBack');
  const e = out !== undefined ? prog(t, out, 0.3, 'inBack') : 0;
  const s = p * (1 - e);
  if (s <= 0.001) return null;
  const float = Math.sin(t * 1.6 + x * 0.01) * 3;
  const fs = 1 + focus * 0.07;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        transform: `translateY(${float + (1 - p) * 60}px) scale(${s * fs})`,
        transformOrigin: '50% 60%',
        zIndex: focus > 0.5 ? 2 : 1,
      }}
    >
      {round ? (
        <div style={{width: imgH, height: imgH, margin: '0 auto', borderRadius: '50%', border: '6px solid #fff', overflow: 'hidden', boxSizing: 'border-box', background: '#ddd'}}>
          <Img src={asset(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      ) : null}
      <div
        style={{
          marginTop: round ? -14 : 0,
          background: C.paper,
          border: `${focus > 0.5 ? 5 : 2.5}px solid ${focus > 0.5 ? C.yellow : '#2a2a2e'}`,
          boxShadow: '4px 7px 6px rgba(0,0,0,0.3)',
          borderRadius: 16,
          padding: round ? '8px 10px 10px' : 6,
          textAlign: 'center',
          fontFamily: FONT_BODY,
        }}
      >
        {!round && (
          <div style={{height: imgH, borderRadius: 12, overflow: 'hidden', background: icon ? '#3a2a24' : '#ddd'}}>
            {icon ?? <Img src={asset(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
          </div>
        )}
        <div
          style={{
            fontWeight: 800,
            fontSize: 23,
            color: titleBg ? '#fff' : C.ink,
            background: titleBg,
            borderRadius: 8,
            margin: round ? 0 : '6px 2px 0',
            padding: titleBg ? '3px 0' : 0,
          }}
        >
          {title}
        </div>
        <div style={{fontWeight: 700, fontSize: bodySize, lineHeight: 1.22, color: '#2c313c', padding: '4px 4px 2px', whiteSpace: 'pre-line'}}>{body}</div>
      </div>
    </div>
  );
};

/** Helper: absolute image in plate space */
export const PlateImg: React.FC<{src: string; x: number; y: number; w: number; h: number; style?: React.CSSProperties}> = ({src, x, y, w, h, style}) => (
  <Img src={asset(src)} style={{position: 'absolute', left: x, top: y, width: w, height: h, ...style}} />
);

/** Screen-space vignette + colour grade */
export const Grade: React.FC<{vignette?: number; tint?: string; tintOpacity?: number; blend?: React.CSSProperties['mixBlendMode']}> = ({
  vignette = 0.45,
  tint,
  tintOpacity = 0.12,
  blend = 'soft-light',
}) => (
  <>
    {/* plain alpha tint (blend modes over the full frame are very slow in software rendering) */}
    {tint && <div style={{position: 'absolute', inset: 0, background: tint, opacity: tintOpacity * (blend === 'multiply' ? 0.9 : 0.55)}} />}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(10,6,4,${vignette}) 100%)`,
      }}
    />
  </>
);
