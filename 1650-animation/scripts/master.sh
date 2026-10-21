#!/usr/bin/env bash
# Audio mastering pass: two-pass EBU R128 loudness normalisation to -16 LUFS / -1.5 dBTP
# (YouTube/streaming friendly). The video stream is copied untouched.
#   bash scripts/master.sh renders/raw.mp4 renders/final.mp4 [audio/mix-master.wav]
set -euo pipefail
in="$1"; out="$2"; wav="${3:-}"
stats=$(ffmpeg -hide_banner -nostats -i "$in" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
af="loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,alimiter=limit=0.84:level=false"
ffmpeg -hide_banner -loglevel error -y -i "$in" -map 0:v -map 0:a -c:v copy -af "$af" -ar 48000 -c:a aac -b:a 256k -movflags +faststart "$out"
if [ -n "$wav" ]; then ffmpeg -hide_banner -loglevel error -y -i "$in" -vn -af "$af" -ar 48000 -c:a pcm_s16le "$wav"; fi
ffmpeg -hide_banner -nostats -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)"
