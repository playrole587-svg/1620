import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import {Main} from './Main';
import {BoyTest} from './BoyTest';
import timeline from './data/timeline.json';

// make sure web fonts are ready before any frame is captured
const fontHandle = delayRender('fonts');
Promise.all(
  ['800 80px Poppins', '700 40px Poppins', '700 30px Nunito', '800 40px Nunito', '600 30px Nunito'].map((f) => document.fonts.load(f)),
).then(() => continueRender(fontHandle));

const FPS = timeline.fps;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={timeline.durationFrames} fps={FPS} width={1920} height={1080} />
    <Composition
      id="Preview"
      component={Main}
      durationInFrames={FPS * 40}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition id="BoyTest" component={BoyTest} durationInFrames={120} fps={FPS} width={1920} height={1080} />
  </>
);
