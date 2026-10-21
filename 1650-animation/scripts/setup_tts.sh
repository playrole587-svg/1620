#!/usr/bin/env bash
# Downloads the offline Indonesian Piper/VITS voice used for the *guide* narration track.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache
if [ ! -d .cache/vits-piper-id_ID-news_tts-medium ]; then
  curl -sSL -o .cache/voice.tar.bz2 \
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-id_ID-news_tts-medium.tar.bz2"
  tar xjf .cache/voice.tar.bz2 -C .cache && rm .cache/voice.tar.bz2
fi
pip install --break-system-packages -q sherpa-onnx soundfile numpy opencv-contrib-python-headless pillow
