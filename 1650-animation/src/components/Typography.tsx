// Kinetic typography: title boxes (brush-edged navy box + number badge), info boxes whose text
// "lights up" in sync with the narration, and karaoke-style subtitles.

import React from 'react';
import {prog, ease, rand} from '../animations/keyframes';
import subtitles from '../data/subtitles.json';

export const C = {
  navy: '#1b2130',
  yellow: '#ffd36b',
  white: '#ffffff',
  paper: '#f5f3ef',
  ink: '#1f2430',
  red: '#e2363b',
};

export const FONT_TITLE = 'Poppins, sans-serif';
export const FONT_BODY = 'Nunito, sans-serif';

/** Rough "brush" rectangle path (deterministic jitter). */
export function roughRect(w: number, h: number, r: number, seed: number, jitter = 7) {
  const pts: [number, number][] = [];
  const step = 22;
  const push = (x: number, y: number, nx: number, ny: number, i: number) => {
    const j = (rand(seed + i * 1.37) - 0.5) * jitter + (rand(seed + i * 7.1) > 0.85 ? jitter * 0.8 : 0);
    pts.push([x + nx * j, y + ny * j]);
  };
  let i = 0;
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 4; k++) {
      const a = a0 + ((a1 - a0) * k) / 4;
      push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a), i++);
    }
  };
  for (let x = r; x <= w - r; x += step) push(x, 0, 0, -1, i++);
  arc(w - r, r, -Math.PI / 2, 0);
  for (let y = r; y <= h - r; y += step) push(w, y, 1, 0, i++);
  arc(w - r, h - r, 0, Math.PI / 2);
  for (let x = w - r; x >= r; x -= step) push(x, h, 0, 1, i++);
  arc(r, h - r, Math.PI / 2, Math.PI);
  for (let y = h - r; y >= r; y -= step) push(0, y, -1, 0, i++);
  arc(r, r, Math.PI, Math.PI * 1.5);
  return 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ' Z';
}

function roughCircle(r: number, seed: number, jitter = 6) {
  const pts: string[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = r + (rand(seed + i) - 0.5) * jitter;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`);
  }
  return 'M ' + pts.join(' L ') + ' Z';
}

type TitleProps = {
  t: number;
  t0: number; // appear time
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  accentFrom?: number; // lines with index >= accentFrom are yellow
  num?: string;
  size?: number;
  seed?: number;
  out?: number; // exit time (optional)
};

/** Title box in plate coordinates (rendered inside a <PlateSvg>). Words pop in one by one. */
export const TitleBox: React.FC<TitleProps> = ({t, t0, x, y, w, h, lines, accentFrom = 1, num, size = 78, seed = 3, out}) => {
  const p = prog(t, t0, 0.55, 'outBack');
  const exit = out !== undefined ? prog(t, out, 0.4, 'inBack') : 0;
  const s = Math.max(0, p * (1 - exit));
  if (s <= 0.001) return null;
  const badgeR = num ? h * 0.38 : 0;
  const boxX = num ? badgeR * 1.55 : 0;
  const shine = ((t - t0 - 1.2) % 6) / 1.1; // periodic shine sweep
  const lineGap = h / lines.length;
  let wi = 0;
  const wordAnim = (i: number) => {
    const a = prog(t, t0 + 0.15 + i * 0.075, 0.45, 'outBack');
    return {opacity: Math.min(1, a * 1.5), transform: `translate(0px, ${(1 - a) * 26}px) scale(${0.7 + 0.3 * a})`};
  };
  const path = roughRect(w - boxX, h, 34, seed);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`translate(${w / 2} ${h / 2}) scale(${s}) translate(${-w / 2} ${-h / 2})`}>
        <g transform={`translate(${boxX} 0)`}>
          <path d={path} fill={C.navy} opacity={0.97} />
          <clipPath id={`clip-title-${seed}`}>
            <path d={path} />
          </clipPath>
          {shine > 0 && shine < 1 && (
            <g clipPath={`url(#clip-title-${seed})`}>
              <rect x={-200 + shine * (w + 400)} y={-20} width={70} height={h + 40} fill="#fff" opacity={0.08} transform="skewX(-20)" />
            </g>
          )}
          {lines.map((ln, li) => (
            <text
              key={li}
              x={(w - boxX) * 0.055}
              y={lineGap * (li + 0.5) + size * 0.36}
              fontFamily={FONT_TITLE}
              fontWeight={800}
              fontSize={size}
              fill={li >= accentFrom ? C.yellow : C.white}
            >
              {ln.split(' ').map((wd, i, arr) => (
                <tspan key={i} style={{...wordAnim(wi++), transformBox: 'fill-box', transformOrigin: 'center'}}>
                  {wd + (i < arr.length - 1 ? ' ' : '')}
                </tspan>
              ))}
            </text>
          ))}
        </g>
        {num && (
          <g transform={`translate(${badgeR * 0.95} ${h / 2}) rotate(${(1 - prog(t, t0, 0.7, 'outBack')) * -90})`}>
            <path d={roughCircle(badgeR, seed + 9, 8)} fill="#fff" />
            <text x={-badgeR * 0.05} y={badgeR * 0.36} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={800} fontSize={badgeR * 1.15} fill={C.navy}>
              {num}
            </text>
          </g>
        )}
      </g>
    </g>
  );
};

type InfoProps = {
  t: number;
  t0: number; // box appears
  read0: number; // words start lighting up
  read1: number; // all words lit
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  size?: number;
  keywords?: string[];
  out?: number;
};

/** Info box in plate coordinates. Text is visible but dim, and lights up word by word while read. */
export const InfoBox: React.FC<InfoProps> = ({t, t0, read0, read1, x, y, w, h, lines, size = 27, keywords = [], out}) => {
  const p = prog(t, t0, 0.5, 'outBack');
  const exit = out !== undefined ? prog(t, out, 0.35, 'inBack') : 0;
  const s = Math.max(0, p * (1 - exit));
  if (s <= 0.001) return null;
  const all = lines.flatMap((l, li) => l.split(' ').map((wd) => ({wd, li})));
  const n = all.length;
  const lineH = (h - size * 1.2) / lines.length;
  let k = 0;
  return (
    <g transform={`translate(${x + w / 2} ${y + h / 2}) scale(${s}) translate(${-w / 2} ${-h / 2})`}>
      <rect x={6} y={8} width={w} height={h} rx={22} fill="#000" opacity={0.22} />
      <rect x={0} y={0} width={w} height={h} rx={22} fill={C.paper} stroke="#2a2a2e" strokeWidth={3} />
      {lines.map((l, li) => {
        const words = l.split(' ');
        return (
          <text key={li} x={size * 1.05} y={size * 1.5 + li * lineH} fontFamily={FONT_BODY} fontWeight={700} fontSize={size} fill={C.ink}>
            {words.map((wd, wi) => {
              const idx = k++;
              const lit = prog(t, read0 + ((read1 - read0) * idx) / n, 0.25, 'outQuad');
              const isKey = keywords.some((kw) => wd.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').startsWith(kw.toLowerCase()));
              return (
                <tspan key={wi} opacity={0.32 + 0.68 * lit} fill={isKey && lit > 0.5 ? '#b5371f' : C.ink} fontWeight={isKey ? 800 : 700}>
                  {wd + (wi < words.length - 1 ? ' ' : '')}
                </tspan>
              );
            })}
          </text>
        );
      })}
      {all.length === 0 ? null : null}
    </g>
  );
};

// ---------------------------------------------------------------------------
type Cue = {start: number; end: number; text: string; breakAt: number | null; words: {w: string; start: number; end: number}[]};

/** Global karaoke subtitles (screen space, absolute time in seconds). */
export const Subtitles: React.FC<{time: number}> = ({time}) => {
  const cue = (subtitles as Cue[]).find((c) => time >= c.start - 0.05 && time <= c.end);
  if (!cue) return null;
  const pin = ease.outBack(Math.min(1, (time - cue.start + 0.05) / 0.25));
  const pout = Math.min(1, Math.max(0, (cue.end - time) / 0.15));
  const lines: Cue['words'][] = cue.breakAt ? [cue.words.slice(0, cue.breakAt), cue.words.slice(cue.breakAt)] : [cue.words];
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 34,
        display: 'flex',
        justifyContent: 'center',
        opacity: pout,
        transform: `translateY(${(1 - pin) * 18}px) scale(${0.94 + 0.06 * pin})`,
      }}
    >
      <div
        style={{
          background: 'rgba(16,18,26,0.72)',
          borderRadius: 18,
          padding: '12px 30px 14px',
          maxWidth: 1500,
          textAlign: 'center',
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: 42,
          lineHeight: 1.22,
          color: '#fff',
          letterSpacing: 0.2,
        }}
      >
        {lines.map((ws, li) => (
          <div key={li}>
            {ws.map((w, i) => {
              const active = time >= w.start && time < w.end + 0.05;
              const done = time >= w.end;
              return (
                <span key={i} style={{color: active ? C.yellow : done ? '#ffffff' : 'rgba(255,255,255,0.78)'}}>
                  {w.w}
                  {i < ws.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
