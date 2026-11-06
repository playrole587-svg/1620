# Original synthesized SFX track for the film (no samples, no music library). 60 s, 48 kHz stereo wav.
import numpy as np, wave, sys
SR = 48000; DUR = 60.0; N = int(SR * DUR)
rs = np.random.RandomState(7)
L = np.zeros(N); R = np.zeros(N)
t_all = np.arange(N) / SR

def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i+len(s)] += s * (1 - max(0, pan)); R[i:i+len(s)] += s * (1 + min(0, pan))

def env(n, a=0.01, d=0.2, sus=0.0):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1) * (sus + (1 - sus) * np.exp(-t / d))

def lp(x, fc):  # one-pole low-pass
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def lp_fast(x, fc, passes=2):
    for _ in range(passes): x = np.convolve(x, np.ones(max(1, int(SR / fc / 2))) / max(1, int(SR / fc / 2)), mode="same")
    return x
def hp(x, fc): return x - lp_fast(x, fc, 1)
def noise(n): return rs.randn(n)
def sine(f, n, ph=0): return np.sin(2 * np.pi * f * np.arange(n) / SR + ph)
def seg(a, b, sig, pan=0.0):
    i, j = int(a * SR), int(b * SR); s = sig[: j - i]
    ramp = np.minimum(np.linspace(0, 1, len(s)) * 6, 1) * np.minimum(np.linspace(1, 0, len(s)) * 6, 1)
    add(s * ramp, a, pan)

def bell(f, at, gain=0.3, dec=1.6):
    n = int(SR * 4); t = np.arange(n) / SR
    s = (sine(f, n) + 0.5 * sine(f * 2.76, n) * np.exp(-t * 2) + 0.3 * sine(f * 5.4, n) * np.exp(-t * 4)) * np.exp(-t / dec)
    add(s * gain, at, 0.0)
def thump(at, gain=0.6, f0=70):
    n = int(SR * 0.5); t = np.arange(n) / SR
    s = sine(f0 * np.exp(-t * 6) + 35, n) * np.exp(-t * 7); add(s * gain, at)
def click(at, gain=0.25, pan=0.0):
    n = int(SR * 0.03); s = noise(n) * np.exp(-np.arange(n) / SR / 0.004); add(hp(s, 2500) * gain, at, pan)
def whoosh(a, b, gain=0.3, up=True):
    n = int((b - a) * SR); x = noise(n); t = np.linspace(0, 1, n)
    f = (lp_fast(x, 400, 1) * (1 - t) + hp(x, 1500) * t) if up else (hp(x, 1500) * (1 - t) + lp_fast(x, 400, 1) * t)
    e = np.sin(np.pi * t) ** 2; add(f * e * gain, a)
def rain(a, b, gain=0.12):
    n = int((b - a) * SR); x = noise(n); seg(a, b, hp(lp_fast(x, 9000, 1), 700) * gain)
def crowd(a, b, g0, g1):
    n = int((b - a) * SR); x = lp_fast(noise(n), 1800, 2) - lp_fast(noise(n), 250, 1)
    mod = 0.7 + 0.3 * np.sin(np.arange(n) / SR * 1.7) ; g = np.linspace(g0, g1, n); add(x * mod * g * 3, a)
def drone(a, b, f, gain):
    n = int((b - a) * SR); seg(a, b, (sine(f, n) + 0.6 * sine(f * 1.5, n) + 0.4 * sine(f * 2.01, n)) * gain)
def footsteps(a, b, step=0.34, gain=0.35):
    t = a; k = 0
    while t < b:
        n = int(SR * 0.09); s = lp_fast(noise(n), 900, 2) * np.exp(-np.arange(n) / SR / 0.025); add(s * gain, t, 0.15 * (-1) ** k); t += step; k += 1
def chirp(at, f, gain=0.12):
    n = int(SR * 0.16); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (f + 900 * t / 0.16 * np.sin(t * 30)) * t) * np.sin(np.pi * t / 0.16); add(s * gain, at, rs.uniform(-0.6, 0.6))

# transitions (dip-to-black cuts)
for c in [8.5, 17, 26, 35, 44, 52]:
    whoosh(c - 0.5, c + 0.05, 0.25); thump(c, 0.35, 60); whoosh(c, c + 0.5, 0.18, up=False)

# 1. birth: wind, birds, a first soft chime, little footsteps, giggle-ish pings
seg(0, 8.6, lp_fast(noise(int(8.6 * SR)), 700, 2) * 0.35)
for tt in [0.7, 1.6, 2.9, 3.5, 4.6, 5.8, 6.7]: chirp(tt, rs.uniform(2600, 3600))
bell(660, 0.9, 0.22); bell(880, 1.5, 0.18); bell(990, 2.1, 0.14)
footsteps(1.5, 2.9, 0.25, 0.22)
for tt in [5.3, 5.55, 5.8]: bell(1320 + 90 * (tt > 5.4), tt, 0.1, 0.5)   # a balloon wave: soft pings

# 2. childhood: rain, distant thunder, lonely low drone
rain(8.5, 17, 0.2); drone(8.7, 17, 82, 0.05)
n = int(SR * 3.5); th = lp_fast(noise(n), 160, 3) * np.exp(-np.arange(n) / SR / 1.2) * 4; add(th, 12.2, 0, 0.8)
bell(440, 10.2, 0.08, 2.2); bell(392, 13.5, 0.07, 2.2)

# 3. studio: room tone, keyboard clicks, mic thump, beat
seg(17, 26.2, lp_fast(noise(int(9.2 * SR)), 500, 2) * 0.12)
for tt in [18.4, 18.55, 18.65, 18.9, 19.0, 19.25, 19.35, 19.5, 19.6]: click(tt, 0.3, -0.3)
n = int(SR * 0.15); add(lp_fast(noise(n), 400, 2) * np.exp(-np.arange(n) / SR / 0.04) * 1.2, 20.2)   # mic tap
for k in range(14):
    tt = 21 + k * 0.5; thump(tt, 0.5 if k % 4 != 3 else 0.35, 60)
    if k % 2 == 1:
        n = int(SR * 0.12); add(hp(noise(n), 3000) * np.exp(-np.arange(n) / SR / 0.02) * 0.3, tt + 0.25)
for tt in np.arange(21.25, 26, 0.5):
    n = int(SR * 0.05); add(hp(noise(n), 6000) * np.exp(-np.arange(n) / SR / 0.012) * 0.18, tt)

# 4. viral: crowd swell, camera shutters, bass pulses, riser
crowd(26, 35.2, 0.02, 0.22)
whoosh(26.2, 28.0, 0.28)
for tt in np.arange(28.5, 34.5, 0.37):
    if rs.rand() < 0.8: click(tt + rs.rand() * 0.2, 0.3, rs.uniform(-0.8, 0.8)); click(tt + 0.05 + rs.rand() * 0.2, 0.2, rs.uniform(-0.8, 0.8))
for k in range(16): thump(28 + k * 0.42, 0.4 + 0.2 * (k / 16), 55)
n = int(SR * 3); r = np.linspace(0, 1, n); add(sine(200 + 1800 * r ** 2, n) * 0 + np.sin(2 * np.pi * np.cumsum(200 + 1800 * r ** 2) / SR) * r ** 2 * 0.12, 31.5)

# 5. stage: hit, crowd roar, bass, chart sweep, ding
thump(35.4, 0.9, 50); whoosh(35.1, 35.5, 0.3)
crowd(35, 44.2, 0.2, 0.32)
for k in range(18): thump(36.4 + k * 0.42, 0.5, 52)
for tt in np.arange(36.4, 44, 0.42):
    if int((tt - 36.4) / 0.42) % 2: 
        n = int(SR * 0.14); add(lp_fast(hp(noise(n), 800), 6000, 1) * np.exp(-np.arange(n) / SR / 0.05) * 0.4, tt + 0.21)
n = int(SR * 4); r = np.linspace(0, 1, n); add(np.sin(2 * np.pi * np.cumsum(260 + 700 * r) / SR) * r * 0.1, 39.2)
bell(1568, 43.1, 0.25, 1.4); bell(1175, 43.1, 0.2, 1.4); bell(784, 43.1, 0.2, 1.8)

# 6. court: rain, cold drone, two gavel knocks
rain(44, 52, 0.22); drone(44.2, 52, 55, 0.07); drone(44.2, 52, 110.5, 0.03)
for tt in [47.6, 48.3]:
    n = int(SR * 0.4); tt_ = np.arange(n) / SR
    add((sine(180, n) * np.exp(-tt_ / 0.05) + lp_fast(noise(n), 2500, 1) * np.exp(-tt_ / 0.01) * 2) * 0.9, tt)
footsteps(44.6, 47.0, 0.42, 0.28)

# 7. memorial: night wind, candle crackle, three soft bells, fade
seg(52, 60, lp_fast(noise(int(8 * SR)), 450, 2) * 0.22)
for tt in np.arange(52.5, 58.5, 0.09):
    if rs.rand() < 0.35:
        n = int(SR * 0.012); add(hp(noise(n), 3000) * np.exp(-np.arange(n) / SR / 0.003) * rs.uniform(0.1, 0.35), tt, rs.uniform(-0.5, 0.5))
footsteps(54.0, 57.5, 0.46, 0.2)
bell(523, 53.0, 0.2, 2.4); bell(659, 55.2, 0.2, 2.6); bell(784, 57.2, 0.22, 3.0); bell(392, 57.2, 0.15, 3.2)

# master: gentle limiter + end fade
m = max(np.abs(L).max(), np.abs(R).max()); L, R = L / m * 0.85, R / m * 0.85
fade = np.minimum(np.minimum(t_all / 0.3, 1), (DUR - t_all) / 1.8).clip(0, 1); L *= fade; R *= fade
pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], DUR, "s")
