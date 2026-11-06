#!/usr/bin/env bash
# One command on a machine with a GPU: SFX -> final 1080x1920@60 render -> mux -> -14 LUFS -> checks.
# Do NOT set CHROME_BIN here; Remotion downloads its own Chrome. Needs node>=22.13, ffmpeg, python3+numpy.
set -euo pipefail
mkdir -p out
python3 scripts/sfx.py out/sfx.wav
ffmpeg -hide_banner -loglevel error -y -i out/sfx.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 out/sfx_n.wav
npx remotion render FilmFinal out/final_silent.mp4 --codec=h264 --crf=16 --pixel-format=yuv420p --concurrency=50%
ffmpeg -hide_banner -loglevel error -y -i out/final_silent.mp4 -i out/sfx_n.wav -c:v copy -c:a aac -b:a 256k -shortest out/final.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of default=nw=1 out/final.mp4
ffmpeg -hide_banner -i out/final.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "Done: out/final.mp4"
