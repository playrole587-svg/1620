#!/usr/bin/env python3
"""Narration pipeline: script -> guide TTS -> timing -> narration.json / SRT / timeline.

Reads  transcripts/narration-script.json
Writes audio/narration/<segment>.wav      (per-segment guide voice, 48 kHz mono)
       audio/narration-guide.wav          (full narration track placed on the timeline)
       transcripts/narration.json         (scene + segment + word timestamps)
       src/data/timeline.json             (same data, consumed by Remotion)
       subtitles/subtitles.srt            (Indonesian subtitles)
       transcripts/scene-timing.json      (scene start/end summary)

Existing segment WAVs are reused (timings are re-measured from them); pass --regen-tts to
re-synthesise. To use a real voice-over, drop recordings into audio/narration/ with the same
names and run again: all timings, subtitles and the timeline follow the recordings.

The guide voice is a synthetic placeholder (Piper VITS "id_ID-news_tts-medium" via
sherpa-onnx), NOT a human recording.
"""
import json, os, re, sys, subprocess
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 60
SR = 48000
VOICE = os.path.join(ROOT, ".cache", "vits-piper-id_ID-news_tts-medium")
NO_TTS = "--no-tts" in sys.argv
REGEN = "--regen-tts" in sys.argv  # VITS sampling is stochastic: only re-synthesise on request


def p(*a):
    return os.path.join(ROOT, *a)


def tts_engine():
    import sherpa_onnx
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=os.path.join(VOICE, "id_ID-news_tts-medium.onnx"),
                tokens=os.path.join(VOICE, "tokens.txt"),
                data_dir=os.path.join(VOICE, "espeak-ng-data"),
                length_scale=1.0,
            ),
            num_threads=4,
        )
    )
    return sherpa_onnx.OfflineTts(cfg)


def resample(x, sr_in, sr_out):
    if sr_in == sr_out:
        return x
    n = int(round(len(x) * sr_out / sr_in))
    t_in = np.arange(len(x)) / sr_in
    t_out = np.arange(n) / sr_out
    return np.interp(t_out, t_in, x).astype(np.float32)


def trim(x, thr=0.006):
    env = np.abs(x)
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.02 * SR))
    b = min(len(x), idx[-1] + int(0.06 * SR))
    return x[a:b]


def warm(x):
    """Gentle voice polish: DC removal, light low-shelf warmth, peak normalise to -3 dBFS."""
    x = x - np.mean(x)
    # one-pole low-pass blend for a little warmth
    y = np.copy(x)
    a = 0.18
    for i in range(1, len(y)):
        y[i] = y[i - 1] + a * (x[i] - y[i - 1])
    x = 0.85 * x + 0.15 * y
    peak = np.max(np.abs(x)) + 1e-9
    return (x / peak * 10 ** (-3 / 20)).astype(np.float32)


def words_with_times(text, start, end):
    words = text.split()
    spoken = {"1650": "seribu enam ratus lima puluh", "2026": "dua ribu dua puluh enam", "HP": "hape"}

    def weight(w):
        core = re.sub(r"[^\wÀ-ÿ-]", "", w)
        core = re.sub(r"^(HP)(-mu)?$", lambda m: "hape" + (m.group(2) or ""), core)
        base = len(spoken.get(core, core)) + 1.5
        return base + (3.0 if re.search(r"[,.!?…:]", w) else 0.0)  # pauses after punctuation

    weights = [weight(w) for w in words]
    tot = sum(weights)
    out, t = [], start
    for w, wt in zip(words, weights):
        d = (end - start) * wt / tot
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return out


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def chunk_words(words, max_chars=84):
    """Group words into subtitle cues (<= 2 lines x 42 chars), breaking at clause punctuation."""
    clauses, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[,.!?…:;]['”\"]?$", w["w"]):
            clauses.append(cur)
            cur = []
    if cur:
        clauses.append(cur)
    text = lambda ws: " ".join(x["w"] for x in ws)
    pieces = []
    for c in clauses:  # split over-long clauses evenly
        if len(text(c)) <= max_chars:
            pieces.append(c)
            continue
        k = -(-len(text(c)) // max_chars)
        size = -(-len(c) // k)
        pieces += [c[i:i + size] for i in range(0, len(c), size)]
    cues, cur = [], []
    for c in pieces:
        if cur and (len(text(cur + c)) > max_chars or re.search(r"[.!?…]['”\"]?$", cur[-1]["w"])):
            cues.append(cur)
            cur = []
        cur = cur + c
    if cur:
        cues.append(cur)
    return cues


def two_lines(text, width=42):
    if len(text) <= width:
        return text
    words = text.split()
    best, best_cost = text, 1e9
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        cost = max(len(a), len(b))
        if cost < best_cost:
            best, best_cost = a + "\n" + b, cost
    return best


def main():
    script = json.load(open(p("transcripts", "narration-script.json"), encoding="utf-8"))
    os.makedirs(p("audio", "narration"), exist_ok=True)
    os.makedirs(p("src", "data"), exist_ok=True)
    os.makedirs(p("subtitles"), exist_ok=True)
    engine = None if NO_TTS else tts_engine()  # loaded lazily-cheap; only used for missing/regen

    t = 0.0
    scenes_out, clips = [], []
    for sc in script["scenes"]:
        s_start = t
        t += sc["leadIn"]
        segs = []
        for seg in sc["segments"]:
            path = p("audio", "narration", f"{seg['id']}.wav")
            if engine is not None and (REGEN or not os.path.exists(path)):
                g = engine.generate(seg["tts"], sid=0, speed=0.97)
                x = resample(np.asarray(g.samples, dtype=np.float32), g.sample_rate, SR)
                x = warm(trim(x))
                sf.write(path, x, SR, subtype="PCM_16")
            else:
                x, sr = sf.read(path, dtype="float32")
                if x.ndim > 1:
                    x = x.mean(axis=1)
                x = resample(x, sr, SR)
            dur = len(x) / SR
            seg_out = {
                "id": seg["id"],
                "text": seg["text"],
                "start": round(t, 3),
                "end": round(t + dur, 3),
                "words": words_with_times(seg["text"], t, t + dur),
                "audio": f"audio/narration/{seg['id']}.wav",
            }
            segs.append(seg_out)
            clips.append((t, x))
            t += dur + seg["pauseAfter"]
        t += sc["tail"]
        # snap scene end to whole frames
        t = round(t * FPS) / FPS
        scenes_out.append({
            "id": sc["id"],
            "title": sc["title"],
            "start": round(s_start, 3),
            "end": round(t, 3),
            "startFrame": int(round(s_start * FPS)),
            "durationFrames": int(round((t - s_start) * FPS)),
            "segments": segs,
        })

    total = t
    track = np.zeros(int(np.ceil(total * SR)) + SR, dtype=np.float32)
    for start, x in clips:
        i = int(round(start * SR))
        track[i:i + len(x)] += x
    track = track[: int(np.ceil(total * SR))]
    sf.write(p("audio", "narration-guide.wav"), track, SR, subtype="PCM_16")

    data = {
        "title": script["title"],
        "fps": FPS,
        "durationSeconds": round(total, 3),
        "durationFrames": int(round(total * FPS)),
        "voice": "GUIDE TTS (synthetic placeholder): Piper VITS id_ID-news_tts-medium via sherpa-onnx",
        "scenes": scenes_out,
    }
    for path in (p("transcripts", "narration.json"), p("src", "data", "timeline.json")):
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    json.dump(
        {
            "fps": FPS,
            "totalSeconds": round(total, 3),
            "scenes": [
                {k: s[k] for k in ("id", "title", "start", "end", "startFrame", "durationFrames")}
                for s in scenes_out
            ],
        },
        open(p("transcripts", "scene-timing.json"), "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=2,
    )

    # SRT
    all_cues, cue_lists = [], []
    for sc in scenes_out:
        for seg in sc["segments"]:
            for cue in chunk_words(seg["words"]):
                cue_lists.append(cue)
                all_cues.append((cue[0]["start"], cue[-1]["end"], " ".join(w["w"] for w in cue)))
    lines = []
    for n, (a, b, text) in enumerate(all_cues, 1):
        nxt = all_cues[n][0] if n < len(all_cues) else b + 1
        b = min(b + 0.25, nxt - 0.04)
        lines.append(f"{n}\n{srt_time(a)} --> {srt_time(b)}\n{two_lines(text)}\n")
    n = len(all_cues) + 1
    open(p("subtitles", "subtitles.srt"), "w", encoding="utf-8").write("\n".join(lines))
    sub_json = []
    for i, (cue_words, (a, b, t)) in enumerate(zip(cue_lists, all_cues)):
        nxt = all_cues[i + 1][0] if i + 1 < len(all_cues) else b + 1
        lines2 = two_lines(t).split("\n")
        sub_json.append({"start": round(a, 3), "end": round(min(b + 0.25, nxt - 0.04), 3), "text": two_lines(t),
                         "breakAt": len(lines2[0].split()) if len(lines2) > 1 else None,
                         "words": cue_words})
    json.dump(sub_json, open(p("src", "data", "subtitles.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # plain narration transcript
    with open(p("transcripts", "narration-transcript.txt"), "w", encoding="utf-8") as f:
        f.write(f"{script['title']}\nNaskah narasi (Bahasa Indonesia)\n\n")
        for sc in scenes_out:
            f.write(f"[{srt_time(sc['start'])}] ADEGAN {sc['id'][1:]} — {sc['title']}\n")
            for seg in sc["segments"]:
                f.write(f"  {srt_time(seg['start'])}  {seg['text']}\n")
            f.write("\n")
    print(f"total {total:.2f}s, {len(clips)} segments, {n - 1} subtitle cues")
    for sc in scenes_out:
        print(f"  {sc['id']}: {sc['start']:7.2f} -> {sc['end']:7.2f}  ({sc['end'] - sc['start']:.1f}s)")


if __name__ == "__main__":
    main()
