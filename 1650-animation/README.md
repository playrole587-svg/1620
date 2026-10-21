# Apa Terjadi Jika Kita Terbangun di Tahun 1650?

An Indonesian educational animated video, about 4 minutes 16 seconds long, in 9 scenes. It is a
Remotion (React + TypeScript) project, built from 8 reference illustrations
(`references/scene01.png` … `scene08.png`). Scene 9 had no reference image, so it is drawn
entirely from original vector art.

## What is in this folder

| Path | Contents |
|---|---|
| `references/` | The 8 reference images, unchanged |
| `transcripts/transcript.txt` | Text taken from every reference (verbatim, plus corrections and notes) |
| `transcripts/narration-script.json` | **Source of truth** for the narration. `text` is the subtitle and `tts` is the spoken form |
| `transcripts/narration.json` | Scene, segment and word timestamps (generated) |
| `transcripts/narration-transcript.txt` | Narration script with timecodes |
| `transcripts/scene-timing.json` | Start and end time of each scene, in seconds and frames |
| `transcripts/keyframes-plan.json` | Keyframe plan (camera + character keys, as start, intermediate and end frames) |
| `subtitles/subtitles.srt` | Indonesian subtitles |
| `audio/narration-guide.wav`, `audio/narration/*.wav` | **Synthetic guide narration (TTS placeholder)**. See the Narration section |
| `audio/music/*.wav` | 7 procedurally composed music cues |
| `sound-effects/*.wav` | 54 procedurally synthesised sound effects |
| `assets/layers.json` | How each reference is split into layers (masks, cut-outs, crops) |
| `assets/plates/` | Generated background plates, sky layers, cut-out characters and crops |
| `src/components/` | Reusable parts: `Boy` (rigged character), `Stage` (camera/parallax), `Typography`, `Graphics`, `Transitions`, `AudioKit` |
| `src/animations/keyframes.ts` | Keyframe engine, easing, and narration anchors |
| `src/scenes/Scene1..9.tsx` | The 9 scenes |
| `scripts/` | Pipeline scripts (see below) |
| `renders/` | `final-4k60.mp4` (master), `final-1080p60.mp4`, `final-1080p60-web.mp4` (committed), `render-settings.json` |
| `audio/mix-master.wav` | Final mastered audio mix (-16 LUFS, -1.5 dBTP) |

## Pipeline

```bash
npm install
bash scripts/setup_tts.sh                  # offline Indonesian voice model + python deps
python3 scripts/build_narration.py         # narration -> timings, SRT, src/data/timeline.json
python3 scripts/prepare_plates.py          # references -> clean plates + layers (≈2 min)
python3 scripts/synth_audio.py             # SFX + music (≈45 s)
node scripts/export-keyframes.mjs          # transcripts/keyframes-plan.json
npx tsc --noEmit                           # typecheck
npx remotion studio src/index.ts           # interactive editing
npx remotion render src/index.ts Preview renders/preview.mp4          # first 40 s
npx remotion render src/index.ts Main renders/final-1080p60.mp4       # 1920x1080, 60 fps
npx remotion render src/index.ts Main renders/final-4k60.mp4 --scale=2  # 3840x2160, 60 fps
bash scripts/master.sh <render.mp4> <final.mp4> [mix.wav]           # loudness -16 LUFS / -1.5 dBTP
python3 scripts/verify.py renders/final-4k60.mp4                       # QA: frames, freezes, black, audio, SRT
```

The exact commands and settings used for the final render are in `renders/render-settings.json`.
On this 4-core, CPU-only machine the 4K render took about 85 minutes, done in two halves.

`node scripts/stills.mjs Main <outdir> <frame…>` renders single frames for review.
Add `DEBUG=1` to outline the silhouette of the original boy, so you can check that the rigged
character covers it.

## How the animation works (it is not a slideshow)

* **Layer decomposition** (`scripts/prepare_plates.py`). From each reference, the script removes
  the boy, the baked-in titles, the text boxes and the "?/!" marks. Big holes are filled by
  row-wise colour interpolation and small ones by Telea inpainting. Shift-map patch inpainting
  was tested first but rejected, because it cloned people and text into the holes. The sky is
  separated into its own layer for parallax. Townspeople, hands, a horse head and similar
  elements are cut out as separate PNG layers so they can move.
* **Rigged character** (`src/components/Boy.tsx`). An original SVG version of the boy: black
  messy hair, white T-shirt, black backpack, black trousers. The skeleton uses forward
  kinematics (hips, torso, head, two arms, two legs). It supports automatic blinking, eye
  direction, a head turn (animated head flip), 8 mouth shapes, sweat drops, fear lines, a
  breathing rate, a walk cycle, sitting and lying poses, and props (phone, map, coin, sack).
  The same rig appears in all 9 scenes.
* **Camera and parallax** (`src/components/Stage.tsx`). A virtual camera (x, y, zoom, rotation,
  shake) moves over the plate, and each layer has its own depth (sky 0.45, plate 1.0,
  foreground 1.06–1.25).
* **Keyframes** (`src/animations/keyframes.ts`). Every motion is a keyframe track with per-key
  easing. Key times can be tied to the narration (`seg('s3b')`, `word('s1d','1650')`), so if
  the narration is re-recorded, the picture follows automatically.
* **Motion graphics**: titles whose words pop in one at a time, info boxes that light up word by
  word as they are read aloud, karaoke subtitles, floating "?/!" marks, manga shock lines,
  arrows that draw themselves, highlight boxes, red X marks, speech bubbles with translations,
  image cards, dust, flies, sparkles, light rays, waving flags, seagulls, clouds, and a phone UI.
* **Transitions**: eyelids opening, whip pans with horizontal motion blur, a match cut
  (scene 6 → 7), zoom-through, dip to black, and a dream ripple (SVG displacement) into the
  bedroom.
* **Sound**: every SFX is placed right next to the visual event it belongs to, inside the scene
  file. Music is ducked automatically under the narration (`AudioKit.voiceActivity`).

## Tools: what was used and what was substituted

* **HyperFrames**: the `hyperframes` CLI (HeyGen) is on npm, but it is a second, separate HTML
  render engine. To keep the pipeline in a single engine, Remotion was used, as the brief
  preferred. The keyframe plan is implemented inside it (`keyframes.ts`) and exported to
  `transcripts/keyframes-plan.json`.
* **GSAP/Motion**: not needed. Remotion renders deterministically frame by frame, and the
  keyframe engine provides the easing.
* **AI segmentation and inpainting** (rembg, LaMa, depth models): could not be used, because
  HuggingFace and model hosts are blocked in this environment. Polygon masks drawn by hand in
  `assets/layers.json` and OpenCV were used instead.
* **Sound libraries** (freesound and similar): blocked. All sounds were therefore synthesised
  from scratch (`scripts/synth_audio.py`): original, so royalty-free.
* **Narration**: no voice recording was provided. Following the brief, an editable narration
  script and timing plan were made. A **synthetic guide voice** was also generated with the
  offline Piper VITS model `id_ID-news_tts-medium` (via sherpa-onnx). It is a temporary
  placeholder (temp VO), not a human recording, and its pronunciation has not been checked by
  ear. Check that model's licence before commercial use.
  **To use a real voice-over**, put the recordings in `audio/narration/<segment>.wav` (s1a, s1b, …),
  build a new `audio/narration-guide.wav` (or run `build_narration.py`, which recalculates every
  timing from the recordings), then render again. Picture, SFX and subtitles shift to match.

## Resolution and upscaling (please read)

* The vectors (character, text, graphics, scene 9) are rendered **natively at 4K** with
  `--scale=2`.
* The painted backgrounds come from 1536×1024 references. They are **upscaled** with Lanczos 2×
  plus a light unsharp mask, then enlarged further by the camera zoom. At 4K, the backgrounds
  are therefore upscaled, not native 4K detail.
* Frame rate is 60 fps, aspect ratio 16:9.

## Content notes

* Scene 8 (punishments) is deliberately **non-graphic**. The reference cards that show blood
  and wounds are not used; symbolic icons replace them. Red pixels on the axe in the reference
  are desaturated, and the lighting is dark and dramatic.
* Historical correction: the reference says "kolera" (cholera) for 1650, but the first cholera
  pandemic only began in 1817. It is replaced by "disentri" (dysentery) and "wabah pes"
  (plague). Malay-style wording (boleh, kecurian, tempat awam, pesalah) is changed to standard
  Indonesian, and "Kurtik" is corrected to "Pasung". All changes are listed in
  `transcripts/transcript.txt`.
* Number badges: the references number points 3–8. The "2." badge was added to scene 2 for
  consistency.
