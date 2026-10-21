// Sound synchronisation helpers. SFX are placed in scene-local seconds right next to the visual
// event they belong to, so picture and sound can never drift apart. Music is ducked
// automatically under the narration using the timeline's segment timestamps.

import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {scenes} from '../animations/keyframes';

export const sfx = (name: string) => staticFile(`sfx/${name}.wav`);

/** global SFX trim: leaves headroom in Remotion's internal mix (final loudness is set by scripts/master.sh) */
const SFX_GAIN = 0.75;

export const Sfx: React.FC<{name: string; at: number; volume?: number; rate?: number; dur?: number; fadeOut?: number}> = ({name, at, volume = 1, rate = 1, dur, fadeOut = 0}) => {
  const {fps} = useVideoConfig();
  const from = Math.max(0, Math.round(at * fps));
  const durationInFrames = dur ? Math.round(dur * fps) : undefined;
  return (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none" name={`sfx:${name}`}>
      <Audio
        src={sfx(name)}
        playbackRate={rate}
        volume={(f) => {
          if (!dur || !fadeOut) return volume * SFX_GAIN;
          const t = f / fps;
          return volume * SFX_GAIN * Math.max(0, Math.min(1, (dur - t) / fadeOut));
        }}
      />
    </Sequence>
  );
};

const narrationSegments = scenes.flatMap((s) => s.segments.map((g) => [g.start, g.end] as [number, number]));

/** 0..1 how strongly the narration is active at absolute time t (smoothed edges). */
export function voiceActivity(t: number) {
  let v = 0;
  for (const [a, b] of narrationSegments) {
    const attack = 0.2;
    const release = 0.45;
    if (t >= a - attack && t <= b + release) {
      const x = t < a ? (t - (a - attack)) / attack : t > b ? 1 - (t - b) / release : 1;
      v = Math.max(v, x);
    }
  }
  return v;
}

/** Background music for a scene: fades in/out, ducked to `duck` level under narration. */
export const Music: React.FC<{name: string; sceneStart: number; dur: number; volume?: number; duck?: number; fadeIn?: number; fadeOut?: number; offset?: number}> = ({
  name,
  sceneStart,
  dur,
  volume = 0.5,
  duck = 0.38,
  fadeIn = 0.8,
  fadeOut = 0.8,
  offset = 0,
}) => {
  const {fps} = useVideoConfig();
  return (
    <Audio
      src={staticFile(`audio/music/${name}.wav`)}
      startFrom={Math.round(offset * fps)}
      volume={(f) => {
        const t = f / fps;
        const env = Math.min(1, t / fadeIn, Math.max(0, (dur - t) / fadeOut));
        const d = 1 - (1 - duck) * voiceActivity(sceneStart + t);
        return volume * env * d;
      }}
    />
  );
};
