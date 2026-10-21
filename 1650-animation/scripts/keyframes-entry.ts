// Collects every scene's keyframe tracks into one "hyperframes" plan (frames @ 60 fps).
import {writeFileSync} from 'node:fs';
import {scenes, FPS} from '../src/animations/keyframes';
import * as s1 from '../src/scenes/Scene1';
import * as s2 from '../src/scenes/Scene2';
import * as s3 from '../src/scenes/Scene3';
import * as s4 from '../src/scenes/Scene4';
import * as s5 from '../src/scenes/Scene5';
import * as s6 from '../src/scenes/Scene6';
import * as s7 from '../src/scenes/Scene7';
import * as s8 from '../src/scenes/Scene8';
import * as s9 from '../src/scenes/Scene9';

const mods = [s1, s2, s3, s4, s5, s6, s7, s8, s9];
const toFrames = (track: {t: number}[], start: number) =>
  track.map((k) => ({frame: Math.round(k.t * FPS), globalFrame: start + Math.round(k.t * FPS), ...k}));

const plan = {
  description:
    'Keyframe plan for every scene. Each track lists start, intermediate and end keyframes; the Remotion scenes interpolate these exact keys (src/animations/keyframes.ts). camera = virtual camera in reference-image pixels (x, y = centre, zoom); boy = character rig parameters.',
  fps: FPS,
  scenes: scenes.map((s, i) => ({
    id: s.id,
    title: s.title,
    startFrame: s.startFrame,
    endFrame: s.startFrame + s.durationFrames,
    durationFrames: s.durationFrames,
    narration: s.segments.map((g) => ({id: g.id, startFrame: Math.round(g.start * FPS), endFrame: Math.round(g.end * FPS)})),
    camera: toFrames(mods[i].camera, s.startFrame),
    boy: toFrames(mods[i].boyTrack, s.startFrame),
  })),
};
writeFileSync(process.argv[2] ?? 'transcripts/keyframes-plan.json', JSON.stringify(plan, null, 1));
console.log('keyframe plan written:', plan.scenes.map((s) => `${s.id}:${s.camera.length + s.boy.length} keys`).join(' '));
