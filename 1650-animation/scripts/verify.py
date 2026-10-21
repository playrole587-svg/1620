#!/usr/bin/env python3
"""Final QA for a rendered video: frame count / fps / resolution, missing or frozen frames,
unexpected black frames, audio clipping & loudness, and subtitle (SRT) integrity.

  python3 scripts/verify.py renders/final-1080p60.mp4 [--expect-width 1920]
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr + subprocess.run(cmd, capture_output=True, text=True).stdout


def main():
    path = sys.argv[1]
    timeline = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json")))
    ok = True

    probe = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-of", "json", path],
        capture_output=True, text=True).stdout)
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
    frames = int(v["nb_read_frames"])
    fps = eval(v["r_frame_rate"])
    print(f"video  {v['width']}x{v['height']} @ {fps:.2f} fps, {frames} frames (expected {timeline['durationFrames']})")
    if frames != timeline["durationFrames"] or abs(fps - timeline["fps"]) > 0.01:
        print("  !! frame count / fps mismatch"); ok = False
    if a is None:
        print("  !! no audio stream"); ok = False

    # frozen-frame scan (long freezes would indicate dropped/duplicated renders)
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-vf", "freezedetect=n=0.0005:d=1.5,blackdetect=d=0.25:pix_th=0.06",
                          "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    freezes = re.findall(r"freeze_start: ([\d.]+).*?freeze_duration: ([\d.]+)", out, re.S)
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", out)
    print(f"freezes >1.5s: {len(freezes)} {[(round(float(s), 1), round(float(d), 1)) for s, d in freezes][:8]}")
    print(f"black segments: {[(round(float(s), 2), round(float(e), 2)) for s, e in blacks]}")
    # black is only expected at the very start (closed eyes), around dips and at the very end
    allowed = [(0, 2.6)]
    for s in timeline["scenes"]:
        allowed.append((s["start"] - 0.8, s["start"] + 0.8))
    allowed.append((timeline["durationSeconds"] - 1.0, timeline["durationSeconds"] + 1))
    for s, e in blacks:
        if not any(lo <= float(s) and float(e) <= hi for lo, hi in allowed):
            print(f"  !! unexpected black {s}-{e}"); ok = False

    if a is not None:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true,astats=metadata=0", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        integ = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1]
        peak = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)[-1]
        clips = re.findall(r"Number of samples clipped: (\d+)|Peak count: (\d+)", out)
        print(f"audio  integrated {integ} LUFS, true peak {peak} dBFS")
        if float(peak) > -1.0:
            print("  !! true peak above -1 dBFS (possible clipping)"); ok = False

    # subtitles
    srt = open(os.path.join(ROOT, "subtitles", "subtitles.srt"), encoding="utf-8").read().strip().split("\n\n")
    tc = lambda s: sum(float(x) * m for x, m in zip(s.replace(",", ".").split(":"), (3600, 60, 1)))
    prev_end, bad = 0, 0
    for i, block in enumerate(srt, 1):
        lines = block.split("\n")
        if lines[0].strip() != str(i):
            bad += 1
        s, e = [tc(x.strip()) for x in lines[1].split("-->")]
        if not (e > s and s >= prev_end - 1e-3) or any(len(l) > 46 for l in lines[2:]) or len(lines) > 4:
            bad += 1
            print("  !! subtitle issue:", block.replace("\n", " | "))
        prev_end = e
    print(f"subtitles {len(srt)} cues, {bad} issues, last ends {prev_end:.1f}s (video {frames / fps:.1f}s)")
    ok &= bad == 0 and prev_end <= frames / fps
    print("RESULT:", "PASS" if ok else "CHECK ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
