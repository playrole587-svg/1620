import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Boy, BoyPose} from './components/Boy';

const poses: Partial<BoyPose>[] = [
  {},
  {mouth: 'open', eyeWide: 1, sweat: 1, armFS: -10, armFE: 135, armBS: 25, armBE: 110, handF: 'fist'},
  {walkAmt: 1, walk: 0.25, mouth: 'smile'},
  {sit: 1, legFH: 85, legBH: 80, legFK: 10, armBS: -30, armBE: 0, handB: 'open', mouth: 'open', sweat: 1},
  {props: 'phone', armFS: 60, armFE: 70, mouth: 'o', brow: 1},
  {props: 'sack', armFS: 160, armFE: 20, mouth: 'grit', lean: 8, eyeSquint: 1},
  {props: 'map', armFS: 40, armFE: 60, armBS: 40, armBE: 60, mouth: 'wavy', brow: 1},
  {headFlip: -1, mouth: 'shout', armFS: 150, armFE: 10, handF: 'open'},
];

export const BoyTest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#8fb3d9'}}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {poses.map((p, i) => (
          <Boy key={i} frame={frame} pose={{x: 150 + (i % 4) * 480, y: i < 4 ? 520 : 1060, scale: 0.55, ...p}} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
