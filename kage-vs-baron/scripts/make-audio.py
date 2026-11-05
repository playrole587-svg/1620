#!/usr/bin/env python3
"""Original music + sound effects for KUIL RETAK, synthesised from scratch (numpy only).
Reads beats from src/scenes/kage/timeline.ts (via scripts/dump-timeline.mjs). Writes public/audio/mix.wav."""
import json, subprocess, wave
import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(1620)
tl = json.loads(subprocess.check_output(["node", "scripts/dump-timeline.mjs"]))
T = tl["T"]

class Sig(np.ndarray):
    """1-D signal whose + pads the shorter operand with silence (sounds of different lengths just sum)."""
    def __new__(cls, a): return np.asarray(a, dtype=float).view(cls)
    def __add__(self, o):
        o = np.asarray(o, dtype=float)
        if o.ndim == 0: return np.asarray(self).__add__(o).view(Sig)
        n = max(len(self), len(o)); a = np.zeros(n); b = np.zeros(n); a[:len(self)] = self; b[:len(o)] = o
        return Sig(a + b)
    __radd__ = __add__

music = np.zeros((2, N)); sfx = np.zeros((2, N)); duck = np.ones(N)

def add(bus, x, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    x = x[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    bus[0, i:i + len(x)] += x * gain * l * 1.414
    bus[1, i:i + len(x)] += x * gain * r * 1.414

def tt(d): return np.arange(int(SR * d)) / SR
def noise(d): return rng.standard_normal(int(SR * d))
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def env(d, a=0.005, dec=0.2, p=2.0):
    t = tt(d); e = np.exp(-t / dec) ** 1.0
    e = e ** (p / 2)
    att = np.minimum(1, t / max(a, 1e-4))
    return e * att
def sine(f, d, ph=0): return np.sin(2 * np.pi * f * tt(d) + ph)
def sweep(f0, f1, d, expo=True):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d) if expo else f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def norm(x, peak=1.0): m = np.max(np.abs(x)) + 1e-9; return x / m * peak

def _thump(f0=160, f1=45, d=0.25, dec=0.07):
    return sweep(f0, f1, d) * env(d, 0.001, dec * 2.2)
def _boom(f=48, d=1.6, dec=0.5):
    return (sine(f, d) + 0.5 * sweep(f * 2.2, f * 0.9, d) * 0.5) * env(d, 0.003, dec)
def _burst(d, lo, hi, dec, a=0.001): return fft_filter(noise(d), lo, hi) * env(d, a, dec)
def _whoosh(d, f0, f1, v=1.0):
    n = noise(d); t = tt(d)
    out = np.zeros_like(n)
    bands = np.geomspace(f0, f1, 6)
    for i, b in enumerate(bands):
        w = fft_filter(n, b * 0.6, b * 1.5)
        c = (i + 0.5) / len(bands)
        e = np.exp(-((t / d - c) ** 2) / 0.02)
        out += w * e
    s = np.sin(np.pi * t / d) ** 1.5
    return out * s * v
def _tink(f, d=0.4, dec=0.12): return (sine(f, d) + 0.4 * sine(f * 2.76, d)) * env(d, 0.0005, dec)
def _clang(base=420, d=1.0, dec=0.35):
    return sum(a * sine(base * r, d) * env(d, 0.0008, dec / (1 + 0.3 * i)) for i, (r, a) in enumerate([(1, 1), (2.32, 0.7), (3.9, 0.5), (5.4, 0.35), (7.1, 0.2)]))

def _kuri_gong(base=95, d=5.0, v=1.0):
    parts = [(1, 1, 3.8), (1.5, .5, 3.0), (2.76, .8, 2.4), (4.07, .55, 1.8), (5.4, .45, 1.3), (6.8, .3, 0.9), (8.9, .2, 0.6)]
    x = sum(a * sine(base * r, d, i) * env(d, 0.004, dc) for i, (r, a, dc) in enumerate(parts))
    x += 0.6 * burst(0.4, 200, 3500, 0.12)[: len(x)].tolist() + [0] * 0 if False else 0
    return x

def _pluck(freq, d=0.9, v=1.0):
    n = int(SR * d); L = int(SR / freq)
    buf = rng.uniform(-1, 1, L); buf = np.convolve(buf, np.ones(3) / 3, mode="same")
    out = np.zeros(n); k = 0; cur = buf.copy()
    while k < n:
        m = min(L, n - k); out[k:k + m] = cur[:m]
        cur = 0.5 * (cur + np.roll(cur, 1)) * 0.996
        k += L
    return out * v * np.exp(-tt(d) / (d * 0.6))

def _taiko(v=1.0, big=False):
    d = 0.9 if big else 0.55
    x = thump(130 if big else 105, 38, d, 0.12 if big else 0.09) * 1.0 + 0.35 * burst(0.09, 400, 2500, 0.03)[: int(SR * d)].tolist().__len__() * 0 if False else None
    body = thump(130 if big else 105, 38, d, 0.14 if big else 0.1)
    sk = np.zeros_like(body); b = burst(0.08, 300, 3000, 0.025); sk[: len(b)] = b
    return (body + 0.4 * sk) * v

def mel(f): return 440 * 2 ** ((f - 69) / 12)
D = {"D2": 38, "D3": 50, "F3": 53, "A3": 57, "D4": 62, "E4": 64, "F4": 65, "A4": 69, "Bb4": 70, "D5": 74, "F5": 77, "A5": 81}

def thump(*a, **k): return Sig(_thump(*a, **k))
def boom(*a, **k): return Sig(_boom(*a, **k))
def burst(*a, **k): return Sig(_burst(*a, **k))
def whoosh(*a, **k): return Sig(_whoosh(*a, **k))
def tink(*a, **k): return Sig(_tink(*a, **k))
def clang(*a, **k): return Sig(_clang(*a, **k))
def kuri_gong(*a, **k): return Sig(_kuri_gong(*a, **k))
def pluck(*a, **k): return Sig(_pluck(*a, **k))
def taiko(*a, **k): return Sig(_taiko(*a, **k))

# ================= MUSIC =================
# drone: D, with its own swell around the eclipse
drone = np.zeros(N); t = np.arange(N) / SR
base = sum(np.sin(2 * np.pi * mel(38) * h * t + h) / h for h in range(1, 7)) * 0.5
base += 0.4 * np.sin(2 * np.pi * mel(26) * t)
g = np.interp(t, [0, 2.4, 7.2, 9.1, 9.16, 9.8, 11.2, 12.8, 15, 17, 20], [0.15, 0.2, 0.28, 0.5, 0.0, 0.0, 0.12, 0.2, 0.12, 0.2, 0.0])
drone = fft_filter(base, 25, 700) * g
music[0] += drone; music[1] += drone

# taiko heartbeat: only gongs before the fight, then a driving pattern at 100 bpm
beat = 0.6
tk = 2.45
while tk < 7.0:
    big = ((tk - 2.45) / beat) % 4 < 0.01
    add(music, taiko(0.9 if big else 0.55, big), tk, -0.1)
    if abs(((tk - 2.45) / beat) % 4 - 3.5) < 0.01: pass
    add(music, taiko(0.3), tk + beat * 0.75, 0.1)
    tk += beat
# eyes: a lone heartbeat; build-up roll on the eclipse
for tt0 in (6.0, 6.75):
    add(music, thump(70, 40, 0.3, 0.08) * 0.9, tt0); add(music, thump(65, 38, 0.3, 0.08) * 0.6, tt0 + 0.2)
tr = 7.25; gap = 0.32
while tr < 9.1:
    add(music, taiko(0.35 + 0.65 * (tr - 7.25) / 1.85), tr, 0.0)
    gap = max(0.07, gap * 0.9); tr += gap
# riser (eclipse build-up)
d = 9.1 - 7.2
ris = sweep(110, 1400, d) * (np.linspace(0, 1, int(SR * d)) ** 2.2) * 0.35
ris += fft_filter(noise(d), 800, 7000) * (np.linspace(0, 1, int(SR * d)) ** 3) * 0.5
add(music, ris, 7.2)
# after the K.O.: slow, heavy taiko
for q in (11.25, 12.45):
    add(music, taiko(1.0, True), q, 0.0)
# plucked line (hirajoshi on D): tense while they fight
scale = [D["D4"], D["E4"], D["F4"], D["A4"], D["Bb4"], D["A4"], D["F4"], D["E4"]]
tp = 2.45; i = 0
while tp < 7.0:
    n = scale[(i * 3) % len(scale)] if i % 4 else scale[i % len(scale)]
    add(music, pluck(mel(n - (12 if i % 8 == 0 else 0)), 0.8, 0.5), tp, (-0.4 if i % 2 else 0.4))
    tp += beat / 2; i += 1
# victory: warm pad + breathy flute line + slow plucks
def pad(f, d, v):
    x = sum(sine(mel(f) * (1 + 0.003 * k), d, k) for k in (-2, -1, 0, 1, 2)) / 5
    return x * np.minimum(1, tt(d) / 2.2) * np.minimum(1, (d - tt(d)) / 2.5) * v
for note, v in ((D["D3"], 0.2), (D["F3"], 0.16), (D["A3"], 0.16), (D["D4"], 0.1)):
    add(music, fft_filter(pad(note, 7.0, v), 80, 2500), 13.0, 0.0)
def flute(f, d, v):
    t_ = tt(d); vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t_) * np.minimum(1, t_ / 0.5)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.35 * fft_filter(noise(d), 2000, 6000) * 0.3
    return x * np.minimum(1, t_ / 0.25) * np.minimum(1, (d - t_) / 0.5) * v
for q, nn, dd in ((13.6, "A4", 1.1), (14.8, "F4", 0.9), (15.7, "D5", 1.9), (17.4, "A4", 2.0)):
    add(music, flute(mel(D[nn]), dd, 0.2), q, 0.2)
for q, nn in ((13.2, "D4"), (13.9, "A4"), (14.6, "F4"), (15.3, "D5"), (16.0, "A4"), (16.6, "F4")):
    add(music, pluck(mel(D[nn]), 1.4, 0.35), q, -0.3)

# ================= SFX =================
def sfx_hit(kind, t0):
    if kind == "punch":
        x = thump(170, 55, 0.25, 0.06) * 0.9 + burst(0.1, 600, 5000, 0.03) * 0.9
        add(sfx, x, t0, 0.0, 1.0)
    elif kind == "kick":
        x = thump(140, 42, 0.3, 0.08) * 1.0 + burst(0.14, 400, 4500, 0.05) * 1.0 + 0.3 * tink(900, 0.2, 0.05)
        add(sfx, x, t0, 0.0, 1.1)
    elif kind == "heavy":
        x = boom(55, 1.2, 0.35) + burst(0.25, 300, 4000, 0.09) * 1.2 + 0.7 * clang(380, 0.9, 0.3)
        add(sfx, x, t0, 0.0, 1.1)
    duck[int(t0 * SR): int((t0 + 0.35) * SR)] *= 0.55 if kind != "heavy" else 0.4

for h in tl["HITS"]:
    sfx_hit(h["kind"], h["t"])
for e in tl["SFX_EXTRA"]:
    nme, t0, v = e["name"], e["t"], e.get("v", 1.0)
    if nme == "gong": add(sfx, kuri_gong(105, 4.5), t0, 0, 0.5 * v)
    elif nme == "gongBig":
        add(sfx, kuri_gong(88, 5.5), t0, 0, 0.7 * v); add(sfx, boom(45, 1.5, 0.6), t0, 0, 0.8)
    elif nme == "step": add(sfx, thump(90, 50, 0.18, 0.05) * 0.45 + burst(0.07, 200, 1500, 0.03) * 0.3, t0, (-0.2 if int(t0 * 100) % 2 else 0.2), v)
    elif nme == "whoosh": add(sfx, whoosh(0.28, 600, 5000), t0 - 0.06, 0, 0.6 * v)
    elif nme == "windup": add(sfx, whoosh(0.5, 150, 1800) * np.linspace(0.3, 1, int(SR * 0.5)), t0, 0, 0.7 * v)
    elif nme == "thud": add(sfx, thump(100, 38, 0.4, 0.1) + burst(0.15, 100, 1200, 0.06), t0, 0, 0.9 * v)
    elif nme == "slide": add(sfx, burst(0.45, 150, 2200, 0.2, 0.02), t0, 0, 0.5 * v)
    elif nme == "heartbeat": pass
    elif nme == "eyeFlash": add(sfx, tink(2900, 1.0, 0.45) * 0.4 + boom(60, 1.0, 0.3) * 0.7 + whoosh(0.25, 2000, 7000) * 0.5, t0, 0, 0.8 * v)
    elif nme == "slam": add(sfx, boom(40, 1.8, 0.6) + burst(0.5, 80, 2500, 0.18) * 1.2 + clang(300, 1.1, 0.4) * 0.5, t0, 0, 1.0 * v); duck[int(t0 * SR): int((t0 + 0.6) * SR)] *= 0.5
    elif nme == "smoke": add(sfx, burst(0.5, 700, 4500, 0.2, 0.02) * 0.7 + tink(1800, 0.3, 0.07) * 0.2, t0, 0, 0.8 * v)
    elif nme == "eclipse": add(sfx, sweep(60, 40, 1.8) * env(1.8, 0.4, 0.9) * 0.9 + fft_filter(noise(1.8), 60, 400) * env(1.8, 0.5, 0.8) * 0.8, t0, 0, 0.6 * v)
    elif nme == "leap": add(sfx, whoosh(0.5, 400, 7000, 1.0) * 0.9 + sweep(300, 1300, 0.45) * env(0.45, 0.02, 0.2) * 0.12, t0, 0, 0.8 * v)
    elif nme == "dive": add(sfx, whoosh(0.5, 6000, 500, 1.0) + sweep(1800, 250, 0.5) * env(0.5, 0.05, 0.3) * 0.2, t0, 0, 1.0 * v)
    elif nme == "strikeHit":
        add(sfx, boom(52, 1.6, 0.45) + burst(0.3, 300, 6000, 0.1) * 1.3 + clang(520, 1.0, 0.35) * 0.8, t0, 0, 1.1 * v); duck[int(t0 * SR): int((t0 + 0.7) * SR)] *= 0.35
    elif nme == "slashTing": add(sfx, burst(0.18, 3500, 12000, 0.06) * 0.9 + tink(3200 + 400 * (t0 % 3), 0.6, 0.2) * 0.6 + sweep(2000, 5200, 0.12) * env(0.12, 0.002, 0.05) * 0.4 + boom(70, 0.4, 0.1) * 0.5, t0, (t0 % 3 - 1) * 0.6, 0.9 * v)
    elif nme == "sheath":
        sc = burst(0.3, 3000, 9000, 0.3, 0.12) * 0.6; add(sfx, sc, t0 - 0.05, 0, 0.7); add(sfx, tink(2400, 0.3, 0.05) * 0.7 + thump(120, 70, 0.1, 0.03) * 0.6, t0 + 0.2, 0, 0.9 * v)
    elif nme == "shatter":
        add(sfx, boom(50, 1.4, 0.45) + burst(0.45, 400, 9000, 0.14) * 1.2, t0, 0, 1.0 * v)
        for j in range(26): add(sfx, tink(rng.uniform(1100, 5200), 0.35, rng.uniform(0.04, 0.14)) * 0.45, t0 + rng.uniform(0, 0.7), rng.uniform(-0.8, 0.8), 0.7)
        duck[int(t0 * SR): int((t0 + 0.9) * SR)] *= 0.35
    elif nme == "debris":
        for j in range(14): add(sfx, tink(rng.uniform(900, 3500), 0.3, 0.06) * 0.35, t0 + rng.uniform(0, 0.9), rng.uniform(-0.7, 0.7), 0.7)
    elif nme == "bodyfall": add(sfx, boom(36, 1.8, 0.55) + burst(0.4, 80, 1800, 0.15) * 1.0 + clang(210, 0.9, 0.28) * 0.8, t0, 0.3, 1.1 * v); duck[int(t0 * SR): int((t0 + 0.8) * SR)] *= 0.4
    elif nme == "ko":
        add(sfx, boom(45, 2.5, 0.8) * 1.0 + clang(160, 1.8, 0.5) * 0.9 + burst(0.6, 120, 5000, 0.25) * 0.9, t0, 0, 1.2 * v); add(sfx, kuri_gong(75, 5.0), t0, 0, 0.6)
    elif nme == "moonReturn":
        for j, ff in enumerate((1568, 2093, 2637, 3136)): add(sfx, sine(ff, 2.2) * env(2.2, 0.05, 0.9) * 0.14, t0 + 0.12 * j, (-0.6 + 0.4 * j), 1.0)
    elif nme == "winChime":
        for j, nn in enumerate(("D5", "F5", "A5", "D5")): add(sfx, (sine(mel(D[nn]), 2.0) + 0.3 * sine(mel(D[nn]) * 2.01, 2.0)) * env(2.0, 0.004, 0.8) * 0.2, t0 + 0.22 * j, 0.2 - 0.2 * j, 1.0)
    elif nme == "logoHit": add(sfx, kuri_gong(80, 3.4) * 0.9 + boom(42, 2.0, 0.6) + burst(0.3, 200, 5000, 0.1) * 0.5, t0, 0, 0.9 * v); duck[int(t0 * SR): int((t0 + 0.8) * SR)] *= 0.5

# fog / wind bed: very quiet, keeps the night alive
wind = fft_filter(noise(DUR), 150, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 1)) * 0.05
music[0] += wind; music[1] += np.roll(wind, 900)

# duck the music under the hits (smoothed), fade in/out, mix
k = int(0.03 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same")
mix = music * 0.75 * duck + sfx
fade = np.minimum(1, t / 0.4) * np.minimum(1, (DUR - t) / 0.7)
mix *= fade
mix = np.tanh(mix * 0.9) / np.tanh(0.9)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
pcm = (mix.T * 32767).astype("<i2")
with wave.open("public/audio/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote public/audio/mix.wav", mix.shape)
