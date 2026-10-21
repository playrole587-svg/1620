// Scene shell with entrance/exit transitions: whip pan (directional motion blur), white flash,
// dip to black, eyelid open/close, dream ripple. Transitions are applied inside each scene's own
// time window; matching an exit with the next scene's entrance gives seamless cuts.

import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ease} from '../animations/keyframes';

export type TransKind = 'whip' | 'whipLeft' | 'flash' | 'dip' | 'eyes' | 'cut' | 'zoom' | 'dream';

const WHIP = 0.28; // seconds for each half of a whip pan

export const SceneShell: React.FC<{
  id: string;
  enter?: TransKind;
  exit?: TransKind;
  children: (t: number, frame: number) => React.ReactNode;
}> = ({id, enter = 'cut', exit = 'cut', children}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const T = durationInFrames / fps;
  const tl = T - t; // time left

  let tx = 0;
  let blur = 0;
  let scale = 1;
  let flash = 0;
  let black = 0;
  let lid = 0; // 0 open, 1 closed
  let ripple = 0;

  // entrance
  if ((enter === 'whip' || enter === 'whipLeft') && t < WHIP) {
    const x = 1 - ease.outCubic(t / WHIP);
    tx = (enter === 'whip' ? 1 : -1) * 1500 * x;
    blur = 90 * x;
  }
  if (enter === 'flash' && t < 0.5) flash = 1 - ease.outQuad(t / 0.5);
  if (enter === 'dip' && t < 0.6) black = 1 - ease.inOutQuad(t / 0.6);
  if (enter === 'zoom' && t < 0.4) {
    const x = 1 - ease.outCubic(t / 0.4);
    scale = 1 + x * 0.6;
    blur = 0;
    flash = x * 0.6;
  }
  if (enter === 'eyes') {
    // two slow blinks opening the eyes
    const o = (a: number, b: number) => ease.inOutCubic(Math.max(0, Math.min(1, (t - a) / (b - a))));
    lid = 1 - (t < 1.3 ? 0.55 * o(0.3, 1.0) : t < 1.6 ? 0.55 * (1 - o(1.3, 1.5)) : o(1.6, 2.4));
  }
  if (enter === 'dream' && t < 1.4) ripple = 1 - ease.outCubic(t / 1.4);

  // exit
  if ((exit === 'whip' || exit === 'whipLeft') && tl < WHIP) {
    const x = ease.inCubic(1 - tl / WHIP);
    tx = (exit === 'whip' ? -1 : 1) * 1500 * x;
    blur = 90 * x;
  }
  if (exit === 'flash' && tl < 0.25) flash = ease.inQuad(1 - tl / 0.25);
  if (exit === 'dip' && tl < 0.6) black = ease.inOutQuad(1 - tl / 0.6);
  if (exit === 'zoom' && tl < 0.35) {
    const x = ease.inCubic(1 - tl / 0.35);
    scale = 1 + x * 1.2;
    flash = x * 0.8;
  }
  if (exit === 'dream' && tl < 1.6) ripple = ease.inCubic(1 - tl / 1.6);

  const filterId = `f-${id}`;
  const filters: string[] = [];
  if (blur > 0.5) filters.push(`url(#${filterId}-blur)`);
  if (ripple > 0.01) filters.push(`url(#${filterId}-ripple)`);

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id={`${filterId}-blur`} x="-20%" y="0%" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${blur} 0`} />
          </filter>
          <filter id={`${filterId}-ripple`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency={`0.004 ${0.012 + ripple * 0.01}`} numOctaves={2} seed={Math.floor(frame / 2)} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={ripple * 70} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill
        style={{
          transform: `translateX(${tx}px) scale(${scale})`,
          filter: filters.length ? filters.join(' ') + (ripple > 0.01 ? ` blur(${ripple * 6}px) brightness(${1 + ripple * 0.5})` : '') : undefined,
        }}
      >
        {children(t, frame)}
      </AbsoluteFill>
      {lid > 0.001 && (
        <>
          <div style={{position: 'absolute', left: -500, right: -500, top: 0, height: `${lid * 56}%`, background: '#050405', borderRadius: '0 0 50% 50% / 0 0 18% 18%'}} />
          <div style={{position: 'absolute', left: -500, right: -500, bottom: 0, height: `${lid * 56}%`, background: '#050405', borderRadius: '50% 50% 0 0 / 18% 18% 0 0'}} />
        </>
      )}
      {flash > 0.001 && <AbsoluteFill style={{background: '#fffbe8', opacity: flash}} />}
      {black > 0.001 && <AbsoluteFill style={{background: '#000', opacity: black}} />}
    </AbsoluteFill>
  );
};
