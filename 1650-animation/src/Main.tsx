import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {scenes} from './animations/keyframes';
import {Subtitles} from './components/Typography';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import {Scene7} from './scenes/Scene7';
import {Scene8} from './scenes/Scene8';
import {Scene9} from './scenes/Scene9';

export const SCENES: Record<string, React.FC> = {
  s1: Scene1,
  s2: Scene2,
  s3: Scene3,
  s4: Scene4,
  s5: Scene5,
  s6: Scene6,
  s7: Scene7,
  s8: Scene8,
  s9: Scene9,
};

const SubtitleTrack: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <Subtitles time={frame / fps} />;
};

/** The full film: 9 scene sequences laid out from src/data/timeline.json + narration + subtitles. */
export const Main: React.FC<{subtitles?: boolean; narration?: boolean}> = ({subtitles = true, narration = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {scenes.map((s) => {
      const Comp = SCENES[s.id];
      if (!Comp) return null;
      return (
        <Sequence key={s.id} from={s.startFrame} durationInFrames={s.durationFrames} name={`${s.id} ${s.title}`}>
          <Comp />
        </Sequence>
      );
    })}
    {narration && <Audio src={staticFile('audio/narration-guide.wav')} volume={0.85} />}
    {subtitles && <SubtitleTrack />}
  </AbsoluteFill>
);
