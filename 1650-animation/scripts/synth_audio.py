#!/usr/bin/env python3
"""Procedural sound design + music for the film (100% original, synthesised from scratch with
numpy -> royalty-free, no third-party samples).

Writes sound-effects/<name>.wav (48 kHz, 16-bit) and audio/music/<name>.wav (stereo).
Run: python3 scripts/synth_audio.py
"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
RNG = np.random.default_rng(1650)
SFX_DIR = os.path.join(ROOT, "sound-effects")
MUS_DIR = os.path.join(ROOT, "audio", "music")
os.makedirs(SFX_DIR, exist_ok=True)
os.makedirs(MUS_DIR, exist_ok=True)


# ----------------------------------------------------------------------------- DSP helpers
def t_(d):
    return np.arange(int(d * SR)) / SR


def noise(d, rng=RNG):
    return rng.standard_normal(int(d * SR)).astype(np.float32)


def biquad_bp(x, f0, q):
    """RBJ band-pass (constant skirt). f0 may vary per sample: processed in 128-sample blocks with
    the filter state carried across blocks (scipy lfilter, so it is fast)."""
    x = np.asarray(x, dtype=np.float64)
    f0 = np.broadcast_to(np.asarray(f0, dtype=np.float64), x.shape)
    if np.ndim(f0) == 0 or np.all(f0 == f0.flat[0]):
        blocks = [(0, len(x))]
    else:
        blocks = [(s_, min(s_ + 128, len(x))) for s_ in range(0, len(x), 128)]
    y = np.empty_like(x)
    zi = np.zeros(2)
    for s_, e_ in blocks:
        w0 = 2 * np.pi * min(f0[s_], SR * 0.45) / SR
        alpha = np.sin(w0) / (2 * q)
        a0 = 1 + alpha
        b = np.array([alpha, 0, -alpha]) / a0
        a = np.array([1, -2 * np.cos(w0) / a0, (1 - alpha) / a0])
        y[s_:e_], zi = lfilter(b, a, x[s_:e_], zi=zi)
    return y.astype(np.float32)


def fft_filter(x, lo=None, hi=None):
    """zero-phase brick-ish filter via FFT with soft edges (fast for long signals)"""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, n).astype(np.float32)


def env_adsr(n, a, d, s, r, total=None):
    total = total or n / SR
    e = np.zeros(n, np.float32)
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = max(ia, 1)
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:ia + idd] = np.linspace(1, s, len(e[ia:ia + idd]))
    e[ia + idd:] = s
    if ir > 0:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def expdec(d, tau):
    return np.exp(-t_(d) / tau).astype(np.float32)


def reverb(x, decay=1.6, mix=0.25, stereo=True, pre=0.012, seed=3):
    rng = np.random.default_rng(seed)
    n = int(decay * SR)
    tt = np.arange(n) / SR
    outs = []
    for ch in range(2 if stereo else 1):
        ir = rng.standard_normal(n) * np.exp(-6.9 * tt / decay)
        ir = fft_filter(ir.astype(np.float32), hi=6000)
        ir[: int(pre * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        L = len(x) + n
        N = 1 << int(np.ceil(np.log2(L)))
        wet = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:L]
        dry = np.concatenate([x, np.zeros(n)])
        outs.append(dry * (1 - mix) + wet * mix * 0.9)
    return np.stack(outs, 1) if stereo else outs[0]


def norm(x, peak_db=-1.0):
    p = np.max(np.abs(x)) + 1e-9
    return (x / p * 10 ** (peak_db / 20)).astype(np.float32)


def fade(x, fin=0.005, fout=0.02):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


def save_sfx(name, x, peak=-1.0, rev=None):
    if rev:
        x = reverb(x, *rev)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = fade(norm(x, peak))
    sf.write(os.path.join(SFX_DIR, f"{name}.wav"), x, SR, subtype="PCM_16")


def sine(f, d, phase=0):
    tt = t_(d)
    if np.ndim(f):
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph + phase).astype(np.float32)
    return np.sin(2 * np.pi * f * tt + phase).astype(np.float32)


def place(dst, src, at):
    i = int(at * SR)
    j = min(len(dst), i + len(src))
    if j > i:
        dst[i:j] += src[: j - i]


# ----------------------------------------------------------------------------- SFX
def whoosh(d=0.6, f0=300, f1=2400, name="whoosh", peak=-2):
    n = noise(d)
    tt = t_(d)
    fc = f0 * (f1 / f0) ** (np.sin(np.pi * tt / d) ** 2)
    y = biquad_bp(n, fc, 1.2)
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    save_sfx(name, y * e, peak, rev=(0.6, 0.15))


def pop(name="pop", f=520):
    d = 0.16
    tt = t_(d)
    fr = f * (1 + 1.8 * np.exp(-tt / 0.02))
    y = sine(fr, d) * np.exp(-tt / 0.05)
    y += 0.3 * noise(d) * np.exp(-tt / 0.006)
    save_sfx(name, y, -3)


def ding(name="ding", f=1320):
    d = 1.4
    tt = t_(d)
    y = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (0.5 / m)) for a, m in [(1, 1), (0.4, 2.76), (0.2, 5.4)])
    save_sfx(name, y, -4, rev=(1.2, 0.2))


def chime(name="chime"):
    d = 3.5
    y = np.zeros(int(d * SR), np.float32)
    for i, f in enumerate([1046.5, 1318.5, 1568, 2093]):
        tt = t_(d - i * 0.12)
        tone = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (1.2 / m)) for a, m in [(1, 1), (0.3, 2.76)])
        place(y, tone.astype(np.float32), i * 0.12)
    save_sfx(name, y, -4, rev=(2.0, 0.3))


def buzz(name="buzz"):
    d = 0.35
    tt = t_(d)
    y = np.sign(np.sin(2 * np.pi * 140 * tt)) * 0.5 + np.sign(np.sin(2 * np.pi * 147 * tt)) * 0.5
    y = fft_filter(y.astype(np.float32), hi=1800) * env_adsr(len(tt), 0.005, 0.05, 0.8, 0.08)
    save_sfx(name, y, -6)


def xmark(name="xmark"):
    d = 0.32
    tt = t_(d)
    y = whoosh_burst(0.12, 2500) * 0.8
    out = np.zeros(int(d * SR), np.float32)
    place(out, y, 0)
    place(out, whoosh_burst(0.12, 3200) * 0.7, 0.14)
    thump = sine(110 * (1 + np.exp(-t_(0.2) / 0.03)), 0.2) * np.exp(-t_(0.2) / 0.05)
    place(out, thump, 0.0)
    save_sfx(name, out, -3)


def whoosh_burst(d, fc):
    tt = t_(d)
    return (biquad_bp(noise(d), fc, 2.0) * np.sin(np.pi * tt / d) ** 2).astype(np.float32)


def impact(name="impact", soft=False):
    d = 2.5 if not soft else 1.4
    tt = t_(d)
    f = 48 * (1 + 2.5 * np.exp(-tt / 0.06))
    boom = sine(f, d) * np.exp(-tt / (0.6 if not soft else 0.35))
    hit = fft_filter(noise(d), hi=2500) * np.exp(-tt / 0.03)
    y = boom + (0.5 if not soft else 0.25) * hit
    if not soft:
        y += 0.15 * fft_filter(noise(d), lo=2000) * np.exp(-tt / 0.4)
    save_sfx(name, y, -1.5, rev=(2.2, 0.25))


def shock(name="shock"):
    # cartoon "dun!" stinger + rising zip
    d = 0.9
    y = np.zeros(int(d * SR), np.float32)
    zip_ = sine(np.linspace(400, 1800, int(0.18 * SR)), 0.18) * np.linspace(0.2, 1, int(0.18 * SR))
    place(y, zip_ * 0.4, 0)
    stab = sum(np.sign(np.sin(2 * np.pi * f * t_(0.6))) * 0.25 for f in [220, 261.6, 311.1])
    stab = fft_filter(stab.astype(np.float32), hi=3000) * np.exp(-t_(0.6) / 0.18)
    place(y, stab, 0.17)
    save_sfx(name, y, -3, rev=(0.8, 0.2))


def heartbeat(name="heartbeat", d=10, bpm=92):
    y = np.zeros(int(d * SR), np.float32)
    per = 60 / bpm
    beat = lambda: sine(55 * (1 + 0.6 * np.exp(-t_(0.25) / 0.03)), 0.25) * np.exp(-t_(0.25) / 0.06)
    k = 0
    while k * per < d - 0.4:
        place(y, beat(), k * per)
        place(y, beat() * 0.7, k * per + 0.17)
        k += 1
    y = fft_filter(y, hi=400)
    save_sfx(name, y, -2)


def dream_shimmer(name="dream_shimmer"):
    d = 3.2
    y = np.zeros(int(d * SR), np.float32)
    notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98, 1975.5, 2349.3]
    for i, f in enumerate(notes):
        tt = t_(1.6)
        tone = np.sin(2 * np.pi * f * tt + 2 * np.sin(2 * np.pi * 5 * tt)) * np.exp(-tt / 0.6)
        place(y, tone.astype(np.float32) * 0.5, i * 0.12)
    tt = t_(d)
    sweep = biquad_bp(noise(d), 800 * (6 ** (tt / d)), 3) * np.sin(np.pi * tt / d)
    y += sweep * 0.6
    save_sfx(name, y, -3, rev=(3.0, 0.5))


def alarm(name="alarm", d=2.0):
    # mechanical twin-bell alarm clock: fast hammer between two bells
    y = np.zeros(int(d * SR), np.float32)
    rate = 22
    k = 0
    while k / rate < d:
        f = 2350 if k % 2 == 0 else 2610
        tt = t_(0.12)
        hit = sum(a * np.sin(2 * np.pi * f * m * tt) for a, m in [(1, 1), (0.5, 2.1), (0.3, 3.9)]) * np.exp(-tt / 0.03)
        place(y, hit.astype(np.float32), k / rate)
        k += 1
    y += 0.08 * fft_filter(noise(d), lo=3000)
    save_sfx(name, y, -2, rev=(0.5, 0.1))


def click(name="click"):
    d = 0.08
    tt = t_(d)
    y = fft_filter(noise(d), lo=1500) * np.exp(-tt / 0.004) + sine(1800, d) * np.exp(-tt / 0.01) * 0.4
    save_sfx(name, y, -4)


def coin(name="coin"):
    d = 1.1
    tt = t_(d)
    partials = [(1, 1), (0.6, 2.32), (0.45, 4.25), (0.3, 6.63), (0.2, 9.4)]
    y = sum(a * np.sin(2 * np.pi * 2100 * m * tt) * np.exp(-tt / (0.35 / np.sqrt(m))) for a, m in partials)
    y += 0.4 * fft_filter(noise(d), lo=4000) * np.exp(-tt / 0.004)
    # second bounce
    y2 = np.zeros_like(y)
    place(y2, (y[: int(0.4 * SR)] * 0.45).astype(np.float32), 0.11)
    save_sfx(name, y + y2, -3, rev=(0.6, 0.12))


def coins(name="coins"):
    d = 1.6
    y = np.zeros(int(d * SR), np.float32)
    for k in range(14):
        tt = t_(0.4)
        f = 1800 + RNG.random() * 1500
        hit = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (0.12 / m)) for a, m in [(1, 1), (0.5, 2.3), (0.3, 4.1)])
        place(y, hit.astype(np.float32) * (0.4 + RNG.random() * 0.6), RNG.random() * 1.1)
    save_sfx(name, y, -3, rev=(0.5, 0.1))


def coin_flip(name="coin_flip"):
    d = 0.9
    y = np.zeros(int(d * SR), np.float32)
    tt = t_(0.08)
    ping = sum(a * np.sin(2 * np.pi * 3200 * m * tt) * np.exp(-tt / 0.03) for a, m in [(1, 1), (0.5, 2.4)])
    place(y, ping.astype(np.float32), 0)
    for k in range(10):  # spinning ring
        place(y, (ping * 0.15).astype(np.float32), 0.1 + k * 0.06)
    save_sfx(name, y, -5, rev=(0.4, 0.1))


def card(name="card"):
    d = 0.25
    tt = t_(d)
    y = biquad_bp(noise(d), 3500 - 2000 * tt / d, 1.5) * np.exp(-tt / 0.06)
    y += sine(180, d) * np.exp(-tt / 0.03) * 0.5
    save_sfx(name, y, -4)


def swish(name="swish"):
    whoosh(0.28, 900, 5000, name, -4)


def paper(name="paper"):
    d = 0.9
    y = np.zeros(int(d * SR), np.float32)
    for k in range(22):
        g = fft_filter(noise(0.04), lo=1500) * np.exp(-t_(0.04) / 0.01)
        place(y, g * (0.3 + RNG.random()), RNG.random() * 0.8)
    save_sfx(name, y, -5)


def cloth(name="cloth"):
    d = 0.6
    tt = t_(d)
    y = biquad_bp(noise(d), 1200, 0.8) * np.sin(np.pi * tt / d) ** 1.5
    save_sfx(name, y, -6)


def chalk(name="chalk"):
    d = 0.5
    tt = t_(d)
    y = biquad_bp(noise(d), 3800 + 400 * np.sin(2 * np.pi * 9 * tt), 6) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * tt) ** 2)
    y *= np.sin(np.pi * tt / d)
    save_sfx(name, y, -7)


def glitch(name="glitch"):
    d = 0.7
    y = np.zeros(int(d * SR), np.float32)
    for k in range(9):
        f = RNG.choice([300, 600, 1200, 2400, 900])
        seg_ = np.sign(np.sin(2 * np.pi * f * t_(0.05))) * 0.5
        place(y, seg_.astype(np.float32), k * 0.07)
    y = fft_filter(y, hi=5000)
    save_sfx(name, y, -6)


def error(name="error"):
    d = 0.6
    y = np.zeros(int(d * SR), np.float32)
    for k, f in enumerate([520, 390]):
        tt = t_(0.22)
        tone = (np.sign(np.sin(2 * np.pi * f * tt)) * 0.4 + np.sin(2 * np.pi * f * tt) * 0.6) * env_adsr(len(tt), 0.005, 0.03, 0.8, 0.05)
        place(y, fft_filter(tone.astype(np.float32), hi=3000), k * 0.24)
    save_sfx(name, y, -5)


def phone_search(name="phone_search"):
    d = 1.8
    y = np.zeros(int(d * SR), np.float32)
    for k in range(5):
        tt = t_(0.12)
        place(y, (np.sin(2 * np.pi * 880 * tt) * np.exp(-tt / 0.04)).astype(np.float32) * 0.6, k * 0.35)
    save_sfx(name, y, -8, rev=(0.4, 0.15))


def boing(name="boing"):
    d = 0.6
    tt = t_(d)
    f = 180 + 120 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt / 0.25)
    y = sine(f, d) * np.exp(-tt / 0.25)
    save_sfx(name, y, -5)


def bell(name="bell"):
    d = 5
    tt = t_(d)
    partials = [(1, 0.5), (0.8, 1), (0.5, 1.19), (0.4, 1.5), (0.3, 2.0), (0.2, 2.74)]
    y = sum(a * np.sin(2 * np.pi * 330 * m * tt) * np.exp(-tt / (2.2 / m)) for a, m in partials)
    save_sfx(name, y, -4, rev=(3.5, 0.4))


def anvil(name="anvil"):
    d = 1.5
    y = np.zeros(int(d * SR), np.float32)
    for k in range(3):
        tt = t_(0.9)
        hit = sum(a * np.sin(2 * np.pi * 1400 * m * tt) * np.exp(-tt / (0.25 / m)) for a, m in [(1, 1), (0.6, 2.6), (0.4, 4.1)])
        place(y, hit.astype(np.float32) * (1 - k * 0.2), k * 0.42)
    save_sfx(name, y, -4, rev=(1.0, 0.2))


def chop(name="chop"):
    d = 0.45
    tt = t_(d)
    y = fft_filter(noise(d), hi=2200, lo=150) * np.exp(-tt / 0.03)
    y += sine(120 * (1 + np.exp(-tt / 0.01)), d) * np.exp(-tt / 0.06) * 0.8
    save_sfx(name, y, -3, rev=(0.6, 0.12))


def step(name="step"):
    d = 0.22
    tt = t_(d)
    y = fft_filter(noise(d), hi=900) * np.exp(-tt / 0.025) + sine(85, d) * np.exp(-tt / 0.03) * 0.6
    save_sfx(name, y, -4)


def footsteps(name="footsteps", d=2.4, rate=2.2):
    y = np.zeros(int(d * SR), np.float32)
    k = 0
    while k / rate < d - 0.2:
        tt = t_(0.2)
        s = fft_filter(noise(0.2), hi=900 + RNG.random() * 300) * np.exp(-tt / 0.025) + sine(80, 0.2) * np.exp(-tt / 0.03) * 0.5
        place(y, s.astype(np.float32) * (0.7 + 0.3 * RNG.random()), k / rate + RNG.random() * 0.02)
        k += 1
    save_sfx(name, y, -4)


def hooves(name="hooves", d=5):
    y = np.zeros(int(d * SR), np.float32)
    k = 0
    pattern = [0, 0.11, 0.42, 0.53]
    while k * 0.8 < d:
        for p in pattern:
            tt = t_(0.12)
            clop = fft_filter(noise(0.12), lo=500, hi=3500) * np.exp(-tt / 0.012) + sine(650, 0.12) * np.exp(-tt / 0.02) * 0.6
            place(y, clop.astype(np.float32), k * 0.8 + p)
        k += 1
    save_sfx(name, y, -5, rev=(0.6, 0.15))


def horse(name="horse"):
    # snort + short whinny-like formant glide (stylised)
    d = 1.6
    y = np.zeros(int(d * SR), np.float32)
    tt = t_(0.35)
    snort = biquad_bp(noise(0.35), 700, 1.0) * np.sin(np.pi * tt / 0.35) ** 0.5
    place(y, snort.astype(np.float32), 0)
    tt = t_(1.1)
    f = 420 + 380 * np.sin(np.pi * tt / 1.1) + 60 * np.sin(2 * np.pi * 18 * tt)
    src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)).astype(np.float32)
    vow = biquad_bp(src, 900 + 600 * tt, 4) + 0.6 * biquad_bp(src, 2400, 6)
    vow *= np.sin(np.pi * tt / 1.1) ** 1.5 * 0.5
    place(y, vow.astype(np.float32), 0.4)
    save_sfx(name, y, -5, rev=(1.0, 0.2))


def gull(name="gull"):
    d = 1.6
    y = np.zeros(int(d * SR), np.float32)
    for k in range(3):
        tt = t_(0.32)
        f = 1500 + 900 * np.sin(np.pi * tt / 0.32) - 500 * tt / 0.32
        src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)).astype(np.float32)
        call = biquad_bp(src, 2600, 3) * np.sin(np.pi * tt / 0.32) ** 2
        place(y, call.astype(np.float32) * (1 - k * 0.25), k * 0.38)
    save_sfx(name, y, -6, rev=(1.2, 0.3))


def wood_creak(name="wood_creak"):
    d = 1.4
    tt = t_(d)
    f = 95 + 40 * np.sin(2 * np.pi * 0.6 * tt) + 8 * RNG.standard_normal(len(tt)).cumsum() / np.sqrt(len(tt))
    pulses = np.zeros(len(tt), np.float32)
    ph = np.cumsum(f) / SR
    pulses[np.diff(np.floor(ph), prepend=0) > 0] = 1
    y = biquad_bp(pulses, 900, 3) + 0.6 * biquad_bp(pulses, 1900, 5)
    y *= np.sin(np.pi * tt / d) ** 0.8
    save_sfx(name, y, -5, rev=(0.6, 0.15))


def water_pour(name="water_pour"):
    d = 3.0
    tt = t_(d)
    y = biquad_bp(noise(d), 600 + 300 * np.sin(2 * np.pi * 3 * tt), 1.2) * 0.6
    for k in range(80):
        b = sine(np.linspace(600 + RNG.random() * 900, 1500 + RNG.random() * 900, int(0.04 * SR)), 0.04) * np.exp(-t_(0.04) / 0.012)
        place(y, (b * 0.4).astype(np.float32), RNG.random() * (d - 0.1))
    y *= env_adsr(len(tt), 0.15, 0.1, 0.9, 0.6)
    save_sfx(name, y, -5)


def splash(name="splash"):
    d = 1.0
    tt = t_(d)
    y = fft_filter(noise(d), lo=300, hi=6000) * np.exp(-tt / 0.18)
    save_sfx(name, y, -5, rev=(0.6, 0.1))


def whip_crack(name="whip_crack"):
    # distant, muffled (non-graphic)
    d = 0.6
    tt = t_(d)
    y = fft_filter(noise(d), lo=800, hi=3000) * np.exp(-tt / 0.012)
    save_sfx(name, y, -10, rev=(1.4, 0.45))


def drum(name="drum"):
    d = 1.6
    tt = t_(d)
    y = sine(70 * (1 + 0.5 * np.exp(-tt / 0.04)), d) * np.exp(-tt / 0.35)
    y += fft_filter(noise(d), hi=1200) * np.exp(-tt / 0.04) * 0.4
    save_sfx(name, y, -2, rev=(1.8, 0.3))


def wind(name="wind", d=12):
    tt = t_(d)
    n = noise(d)
    g = 0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * tt) * np.sin(2 * np.pi * 0.07 * tt + 1)
    y = biquad_bp(n, 380 + 300 * g, 0.9) * (0.4 + 0.6 * g)
    y = fade(y, 1.0, 1.0)
    save_sfx(name, y, -8)


def babble(d, voices=12, base=150, seed=7, lp=2400):
    """crowd murmur: many gibberish 'voices' = glottal pulse trains through moving formants."""
    rng = np.random.default_rng(seed)
    y = np.zeros(int(d * SR), np.float32)
    for v in range(voices):
        tt = t_(d)
        f0 = base * (0.8 + 0.6 * rng.random()) * (1 + 0.08 * np.sin(2 * np.pi * (0.3 + rng.random()) * tt))
        src = (np.mod(np.cumsum(f0) / SR, 1) - 0.5).astype(np.float32)
        syl = np.clip(np.sin(2 * np.pi * (2.5 + rng.random() * 2) * tt + rng.random() * 6), 0, 1) ** 0.6
        gate = (np.sin(2 * np.pi * (0.15 + rng.random() * 0.2) * tt + rng.random() * 6) > -0.2).astype(np.float32)
        gate = fft_filter(gate, hi=6)
        f1 = 500 + 250 * np.sin(2 * np.pi * (3 + rng.random()) * tt + rng.random() * 6)
        vox = biquad_bp(src, f1, 3) + 0.5 * biquad_bp(src, f1 * 2.4 + 300, 5)
        y += (vox * syl * gate * (0.4 + rng.random() * 0.6)).astype(np.float32)
    return fft_filter(y, hi=lp, lo=120)


def crowd_murmur(name="crowd_murmur", d=24):
    y = babble(d, 14, 150)
    y = fade(y, 0.8, 0.8)
    save_sfx(name, y, -6, rev=(1.4, 0.35))


def market_amb(name="market_amb", d=34):
    y = babble(d, 16, 160, seed=11) * 0.7
    # wooden clatter + occasional coins
    for k in range(int(d * 1.5)):
        at = RNG.random() * (d - 0.3)
        tt = t_(0.08)
        knock = fft_filter(noise(0.08), lo=400, hi=3000) * np.exp(-tt / 0.01)
        place(y, (knock * 0.25).astype(np.float32), at)
    y = fade(y, 1.0, 1.0)
    save_sfx(name, y, -7, rev=(1.2, 0.3))


def harbor_amb(name="harbor_amb", d=32):
    tt = t_(d)
    waves = biquad_bp(noise(d), 500, 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.12 * tt) ** 2)
    y = waves * 0.8 + babble(d, 10, 150, seed=5) * 0.4
    for k in range(int(d * 0.6)):
        at = RNG.random() * (d - 1)
        tt2 = t_(0.6)
        creak = biquad_bp(noise(0.6), 300 + RNG.random() * 200, 8) * np.sin(np.pi * tt2 / 0.6) * 0.3
        place(y, creak.astype(np.float32), at)
    y = fade(y, 1.5, 1.5)
    save_sfx(name, y, -7, rev=(1.5, 0.3))


def town_amb(name="town_amb", d=27):
    y = babble(d, 8, 140, seed=21) * 0.5 + wind_raw(d) * 0.4
    y = fade(y, 1.0, 1.0)
    save_sfx(name, y, -8, rev=(1.2, 0.3))


def wind_raw(d):
    tt = t_(d)
    g = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * tt)
    return biquad_bp(noise(d), 350 + 250 * g, 0.9) * (0.4 + 0.6 * g)


def flies(name="flies", d=26):
    tt = t_(d)
    y = np.zeros(len(tt), np.float32)
    for k in range(3):
        f = 210 + 30 * k + 25 * np.sin(2 * np.pi * (0.7 + k * 0.3) * tt) + 10 * np.sin(2 * np.pi * 7 * tt)
        src = (np.mod(np.cumsum(f) / SR, 1) - 0.5).astype(np.float32)
        amp = 0.5 + 0.5 * np.sin(2 * np.pi * (0.2 + 0.1 * k) * tt + k) ** 2
        y += fft_filter(src, hi=2500) * amp
    y = fade(y, 1.0, 1.0)
    save_sfx(name, y, -10)


def birds(name="birds", d=14):
    y = np.zeros(int(d * SR), np.float32)
    for k in range(int(d * 2.2)):
        at = RNG.random() * (d - 0.5)
        n = RNG.integers(2, 5)
        f0 = 3000 + RNG.random() * 1800
        for j in range(n):
            tt = t_(0.07)
            f = f0 * (1 + 0.3 * np.sin(np.pi * tt / 0.07)) * (1 - 0.05 * j)
            chirp = sine(f, 0.07) * np.sin(np.pi * tt / 0.07) ** 2
            place(y, (chirp * 0.5).astype(np.float32), at + j * 0.09)
    y = fade(y, 0.5, 1.0)
    save_sfx(name, y, -8, rev=(1.2, 0.3))


# --- stylised non-verbal voice sounds (synthetic breath / formant noise, no recordings)
def breath_noise(d, f0, f1, q=1.4):
    tt = t_(d)
    fc = f0 + (f1 - f0) * tt / d
    return biquad_bp(noise(d), fc, q) + 0.5 * biquad_bp(noise(d), fc * 2.3, 2.0)


def gasp(name="gasp"):
    d = 0.45
    tt = t_(d)
    y = breath_noise(d, 900, 2200) * (np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 0.7) * np.exp(-tt / 0.4)
    save_sfx(name, y, -4, rev=(0.6, 0.15))


def sigh(name="sigh"):
    d = 1.6
    tt = t_(d)
    y = breath_noise(d, 1400, 500) * env_adsr(len(tt), 0.15, 0.3, 0.7, 0.8)
    save_sfx(name, y, -5, rev=(0.8, 0.15))


def breathing(name="breathing", d=12, rate=1.5):
    y = np.zeros(int(d * SR), np.float32)
    per = 1 / rate
    k = 0
    while k * per < d - 0.5:
        tt = t_(per * 0.45)
        inh = breath_noise(per * 0.45, 1100, 1900) * np.sin(np.pi * tt / (per * 0.45))
        tt2 = t_(per * 0.5)
        exh = breath_noise(per * 0.5, 1300, 700) * np.sin(np.pi * tt2 / (per * 0.5))
        decay = max(0.35, 1 - k * per / d * 0.6)
        place(y, (inh * 0.6 * decay).astype(np.float32), k * per)
        place(y, (exh * decay).astype(np.float32), k * per + per * 0.47)
        k += 1
    save_sfx(name, y, -5, rev=(0.5, 0.1))


def cough(name="cough"):
    d = 1.2
    y = np.zeros(int(d * SR), np.float32)
    for k, at in enumerate([0, 0.33, 0.6]):
        tt = t_(0.25)
        c = (biquad_bp(noise(0.25), 500, 1.2) + 0.6 * biquad_bp(noise(0.25), 1500, 2)) * np.exp(-tt / 0.07)
        c += sine(140, 0.25) * np.exp(-tt / 0.05) * 0.4
        place(y, (c * (1 - k * 0.25)).astype(np.float32), at)
    save_sfx(name, y, -6, rev=(0.9, 0.25))


def whisper(name="whisper"):
    d = 1.6
    tt = t_(d)
    y = np.zeros(int(d * SR), np.float32)
    for k in range(6):
        at = k * 0.24 + RNG.random() * 0.05
        l = 0.18
        tt2 = t_(l)
        f = RNG.choice([1800, 2600, 3400, 1200])
        s = (biquad_bp(noise(l), f, 2.5) + 0.7 * biquad_bp(noise(l), 5200, 3)) * np.sin(np.pi * tt2 / l) ** 1.5
        place(y, s.astype(np.float32), at)
    save_sfx(name, y, -6, rev=(0.8, 0.3))


def mumble(name="mumble"):
    """comic gibberish speech (formant-filtered pulse train) for the Dutch merchant"""
    d = 1.8
    tt = t_(d)
    rng = np.random.default_rng(42)
    f0 = 125 * (1 + 0.12 * np.sin(2 * np.pi * 1.3 * tt)) * (1 - 0.1 * tt / d)
    src = (np.mod(np.cumsum(f0) / SR, 1) - 0.5).astype(np.float32)
    nsy = 7
    f1 = np.zeros(len(tt))
    f2 = np.zeros(len(tt))
    amp = np.zeros(len(tt))
    vowels = [(730, 1090), (270, 2290), (300, 870), (530, 1840), (570, 840), (440, 1020)]
    for k in range(nsy):
        a, b = int(k * len(tt) / nsy), int((k + 1) * len(tt) / nsy)
        v = vowels[rng.integers(len(vowels))]
        f1[a:b], f2[a:b] = v
        seg_ = np.sin(np.linspace(0, np.pi, b - a)) ** 0.5
        amp[a:b] = seg_ * (0.7 + 0.3 * rng.random())
    f1 = fft_filter(f1.astype(np.float32), hi=20)
    f2 = fft_filter(f2.astype(np.float32), hi=20)
    y = (biquad_bp(src, f1, 5) + 0.6 * biquad_bp(src, f2, 7)) * amp
    y *= env_adsr(len(tt), 0.03, 0.1, 1, 0.15)
    save_sfx(name, y, -4, rev=(0.6, 0.15))


def strain(name="strain"):
    d = 1.2
    tt = t_(d)
    f0 = 110 + 15 * np.sin(2 * np.pi * 5 * tt)
    src = (np.mod(np.cumsum(f0) / SR, 1) - 0.5).astype(np.float32)
    y = biquad_bp(src, 350, 4) * env_adsr(len(tt), 0.1, 0.2, 0.8, 0.4)
    save_sfx(name, y, -6)


# ----------------------------------------------------------------------------- music
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def midi(n):
    """'A4' -> midi number"""
    name, octv = n[:-1], int(n[-1])
    return 12 * (octv + 1) + NOTE[name]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ks_pluck(f, d, bright=0.5, decay=0.996, rng=RNG):
    """Karplus-Strong plucked string (lute / harpsichord / pizzicato) as an IIR comb (lfilter)."""
    n = int(d * SR)
    p = max(2, int(SR / f))
    exc = np.zeros(n)
    burst = rng.uniform(-1, 1, p)
    if p > 8:
        burst = fft_filter(np.tile(burst, 4).astype(np.float32), hi=1500 + 6000 * bright)[:p]
    exc[:p] = burst
    # y[n] = x[n] + decay * (bright*y[n-p] + (1-bright)*0.5*(y[n-p] + y[n-p-1]))
    a = np.zeros(p + 2)
    a[0] = 1
    a[p] = -decay * (bright + (1 - bright) * 0.5)
    a[p + 1] = -decay * (1 - bright) * 0.5
    y = lfilter([1.0], a, exc).astype(np.float32)
    return y * np.exp(-t_(d) / (d * 0.6)).astype(np.float32)


def pad(freqs, d, bright=1200, amp=0.25):
    tt = t_(d)
    y = np.zeros(len(tt), np.float32)
    for f in freqs:
        for det in (-0.25, 0.25):
            ff = f * (1 + det / 100)
            y += (2 * np.mod(ff * tt + RNG.random(), 1) - 1).astype(np.float32)
    y = fft_filter(y, hi=bright) * amp / max(1, len(freqs))
    return y * env_adsr(len(tt), min(0.6, d / 3), 0.2, 0.9, min(0.8, d / 3))


def bass(f, d, amp=0.5):
    tt = t_(d)
    y = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)
    return (y * env_adsr(len(tt), 0.01, 0.15, 0.6, 0.1) * amp).astype(np.float32)


def bellnote(f, d, amp=0.3):
    tt = t_(d)
    y = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / (1.0 / m)) for a, m in [(1, 1), (0.3, 3.0), (0.15, 4.2)])
    return (y * amp).astype(np.float32)


def frame_drum(d=0.5, f=95, amp=0.5):
    tt = t_(d)
    y = np.sin(2 * np.pi * f * (1 + 0.4 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.12)
    y += fft_filter(noise(d), hi=2000) * np.exp(-tt / 0.02) * 0.3
    return (y * amp).astype(np.float32)


def shaker(d=0.08, amp=0.12):
    tt = t_(d)
    return (fft_filter(noise(d), lo=5000) * np.exp(-tt / 0.02) * amp).astype(np.float32)


def chord_tones(root, quality):
    r = midi(root)
    iv = {'maj': [0, 4, 7], 'min': [0, 3, 7], 'sus': [0, 5, 7], 'dim': [0, 3, 6], 'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10]}[quality]
    return [r + i for i in iv]


def compose(name, length, bpm, prog, scale_root, scale, voices, seed=1, stereo_rev=(2.2, 0.28), master=-3.0):
    """Generic arranger: chord progression (list of (root, quality)) one chord per bar (4 beats)."""
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    bar = 4 * beat
    n = int((length + 3) * SR)
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)
    sc = [midi(scale_root) + s for s in scale]
    sc_all = sorted({m + 12 * o for m in sc for o in (-1, 0, 1, 2)})
    mel = midi(scale_root) + 12
    nbars = int(np.ceil(length / bar))

    def add(sig, at, pan=0.0):
        i = int(at * SR)
        j = min(n, i + len(sig))
        if j <= i:
            return
        L[i:j] += sig[: j - i] * (1 - max(0, pan))
        R[i:j] += sig[: j - i] * (1 + min(0, pan))

    for b in range(nbars):
        root, q = prog[b % len(prog)]
        ct = chord_tones(root, q)
        t0 = b * bar
        if 'pad' in voices:
            add(pad([hz(m) for m in ct], bar + 0.4, bright=voices['pad'].get('bright', 1400), amp=voices['pad']['amp']), t0)
        if 'drone' in voices:
            add(pad([hz(ct[0] - 12), hz(ct[0] - 24)], bar + 0.5, bright=500, amp=voices['drone']['amp']), t0)
        if 'bass' in voices:
            pat = voices['bass'].get('pattern', [0, 2])
            for k in pat:
                f = hz(ct[0] - 24 + (7 if k == 2 and voices['bass'].get('fifth') else 0))
                add(bass(f, beat * 0.9, voices['bass']['amp']), t0 + k * beat)
        if 'arp' in voices:
            v = voices['arp']
            steps = v.get('steps', 8)
            for k in range(steps):
                m = ct[k % len(ct)] + (12 if (k // len(ct)) % 2 else 0) + v.get('oct', 0) * 12
                add(ks_pluck(hz(m), beat * 2, v.get('bright', 0.5), v.get('decay', 0.995), rng) * v['amp'], t0 + k * bar / steps, pan=0.3 * np.sin(k))
        if 'mel' in voices:
            v = voices['mel']
            k = 0
            pos = 0.0
            rhythm = v.get('rhythm', [1, 0.5, 0.5, 1, 1])
            while pos < 4 - 1e-6:
                dur = rhythm[k % len(rhythm)]
                if rng.random() > v.get('rest', 0.2):
                    # random walk on the scale, attracted to chord tones on strong beats
                    i = sc_all.index(min(sc_all, key=lambda x: abs(x - mel)))
                    i = int(np.clip(i + rng.integers(-2, 3), 0, len(sc_all) - 1))
                    mel = sc_all[i]
                    if pos in (0, 2):
                        mel = min([c + 12 * o for c in ct for o in (0, 1, 2)], key=lambda x: abs(x - mel))
                    mel = int(np.clip(mel, midi(v.get('lo', 'C4')), midi(v.get('hi', 'C6'))))
                    if v.get('kind') == 'bell':
                        sig = bellnote(hz(mel), dur * beat * 2, v['amp'])
                    else:
                        sig = ks_pluck(hz(mel), dur * beat * 1.8, v.get('bright', 0.6), 0.996, rng) * v['amp']
                    add(sig, t0 + pos * beat, pan=-0.2)
                pos += dur
                k += 1
        if 'drum' in voices:
            for k in voices['drum'].get('beats', [0, 2]):
                add(frame_drum(0.5, voices['drum'].get('f', 95), voices['drum']['amp']), t0 + k * beat)
        if 'shaker' in voices:
            for k in range(8):
                add(shaker(0.08, voices['shaker']['amp'] * (1.0 if k % 2 else 0.6)), t0 + k * beat / 2, pan=0.4)
        if 'pulse' in voices:  # heartbeat-like low pulse
            for k in (0, 2):
                add(frame_drum(0.4, 55, voices['pulse']['amp']), t0 + k * beat)
                add(frame_drum(0.4, 55, voices['pulse']['amp'] * 0.6), t0 + k * beat + 0.2)

    mix = np.stack([L, R], 1)[: int(length * SR)]
    wet = np.stack([reverb(mix[:, 0], *stereo_rev, stereo=False, seed=4), reverb(mix[:, 1], *stereo_rev, stereo=False, seed=9)], 1)[: len(mix)]
    # loudness-match all cues: RMS -20 dBFS, then a soft limiter keeps peaks under -1 dBFS
    rms = np.sqrt(np.mean(wet ** 2)) + 1e-9
    wet = wet * (10 ** (-20 / 20) / rms)
    lim = 10 ** (-1 / 20)
    wet = np.where(np.abs(wet) > 0.7 * lim, np.sign(wet) * (0.7 * lim + 0.3 * lim * np.tanh((np.abs(wet) - 0.7 * lim) / (0.3 * lim))), wet)
    out = fade(wet.astype(np.float32), 0.05, 2.0)
    sf.write(os.path.join(MUS_DIR, f"{name}.wav"), out, SR, subtype="PCM_16")
    print("music", name, f"{length:.1f}s")


MAJ = [0, 2, 4, 5, 7, 9, 11]
MIN = [0, 2, 3, 5, 7, 8, 10]


def music():
    compose('m_harbor', 32, 84, [('D3', 'min'), ('A#2', 'maj'), ('F3', 'maj'), ('C3', 'maj')], 'D4', MIN,
            {'pad': {'amp': 0.35}, 'arp': {'amp': 0.28, 'steps': 8, 'bright': 0.45}, 'bass': {'amp': 0.35, 'pattern': [0]},
             'mel': {'amp': 0.22, 'rest': 0.45, 'rhythm': [1, 1, 2], 'lo': 'D4', 'hi': 'D5'}}, seed=2)
    compose('m_curious', 44, 104, [('C3', 'maj'), ('A2', 'min'), ('F2', 'maj'), ('G2', 'maj')], 'C4', MAJ,
            {'pad': {'amp': 0.12, 'bright': 900}, 'bass': {'amp': 0.45, 'pattern': [0, 2], 'fifth': True},
             'arp': {'amp': 0.18, 'steps': 4, 'bright': 0.7, 'decay': 0.99},
             'mel': {'amp': 0.3, 'rest': 0.3, 'rhythm': [0.5, 0.5, 1, 0.5, 0.5, 1], 'lo': 'E4', 'hi': 'E5', 'bright': 0.75},
             'shaker': {'amp': 0.6}}, seed=5)
    compose('m_tense', 27, 66, [('D3', 'min'), ('D3', 'min'), ('A#2', 'maj'), ('A2', 'maj')], 'D4', MIN,
            {'drone': {'amp': 0.5}, 'pulse': {'amp': 0.35}, 'arp': {'amp': 0.14, 'steps': 4, 'bright': 0.35},
             'mel': {'amp': 0.14, 'rest': 0.6, 'rhythm': [2, 2], 'lo': 'A3', 'hi': 'A4'}}, seed=8)
    compose('m_work', 33, 96, [('A2', 'min'), ('G2', 'maj'), ('F2', 'maj'), ('E2', 'maj')], 'A3', MIN,
            {'pad': {'amp': 0.15, 'bright': 800}, 'bass': {'amp': 0.45, 'pattern': [0, 1, 2, 3]}, 'drum': {'amp': 0.45, 'beats': [0, 1.5, 2, 3]},
             'mel': {'amp': 0.24, 'rest': 0.35, 'rhythm': [1, 0.5, 0.5, 2], 'lo': 'A3', 'hi': 'A4', 'bright': 0.5}}, seed=11)
    compose('m_market', 35, 112, [('G2', 'maj'), ('D3', 'maj'), ('E2', 'min'), ('C3', 'maj')], 'G4', MAJ,
            {'pad': {'amp': 0.1, 'bright': 900}, 'bass': {'amp': 0.42, 'pattern': [0, 2], 'fifth': True},
             'arp': {'amp': 0.2, 'steps': 8, 'bright': 0.85, 'decay': 0.993, 'oct': 0},
             'mel': {'amp': 0.26, 'rest': 0.3, 'rhythm': [0.5, 0.5, 0.5, 0.5, 1, 1], 'lo': 'G4', 'hi': 'G5', 'bright': 0.85},
             'shaker': {'amp': 0.8}, 'drum': {'amp': 0.3, 'beats': [0, 2.5]}}, seed=13)
    compose('m_dark', 32, 60, [('C3', 'min'), ('C3', 'min'), ('G#2', 'maj'), ('G2', 'dim')], 'C4', MIN,
            {'drone': {'amp': 0.6}, 'pad': {'amp': 0.15, 'bright': 600}, 'drum': {'amp': 0.3, 'beats': [0], 'f': 60},
             'mel': {'amp': 0.12, 'rest': 0.7, 'rhythm': [2, 2], 'lo': 'G3', 'hi': 'G4', 'bright': 0.3}}, seed=17, stereo_rev=(3.0, 0.35))
    compose('m_morning', 26, 80, [('C3', 'maj7'), ('F3', 'maj7'), ('A2', 'min7'), ('G2', 'sus')], 'C5', MAJ,
            {'pad': {'amp': 0.3, 'bright': 1600}, 'bass': {'amp': 0.3, 'pattern': [0]},
             'mel': {'amp': 0.22, 'rest': 0.35, 'rhythm': [1, 1, 0.5, 0.5, 1], 'lo': 'E5', 'hi': 'E6', 'kind': 'bell'},
             'arp': {'amp': 0.12, 'steps': 8, 'bright': 0.6}}, seed=19)


def sfx():
    whoosh(0.6, 300, 2400, "whoosh")
    whoosh(0.35, 500, 2000, "whoosh_soft", -8)
    whoosh(1.4, 150, 3000, "whoosh_long")
    swish()
    pop("pop", 520)
    ding()
    chime()
    buzz()
    xmark()
    impact("impact")
    impact("impact_soft", soft=True)
    shock()
    heartbeat()
    dream_shimmer()
    alarm()
    click()
    coin()
    coins()
    coin_flip()
    card()
    paper()
    cloth()
    chalk()
    glitch()
    error()
    phone_search()
    boing()
    bell()
    anvil()
    chop()
    step()
    footsteps()
    hooves()
    horse()
    gull()
    wood_creak()
    water_pour()
    splash()
    whip_crack()
    drum()
    wind()
    crowd_murmur()
    market_amb()
    harbor_amb()
    town_amb()
    flies()
    birds()
    gasp()
    sigh()
    breathing()
    cough()
    whisper()
    mumble()
    strain()
    print("sfx done:", len(os.listdir(SFX_DIR)))


if __name__ == "__main__":
    import sys
    if "--music-only" not in sys.argv:
        sfx()
    if "--sfx-only" not in sys.argv:
        music()
