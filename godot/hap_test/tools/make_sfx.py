#!/usr/bin/env python3
"""합 시험판 효과음 합성기 (파이썬 표준 라이브러리만 사용).

프로토타입(prototype/index.html)의 WebAudio 합성음(tone/noise + 지수 감쇠 + 잔향)을
흉내 내어 WAV 파일로 미리 만든다. 같은 씨앗을 쓰므로 언제 돌려도 같은 파일이 나온다.

    python3 tools/make_sfx.py [출력 폴더]   (기본: assets/sfx)
"""
import math
import os
import random
import struct
import sys
import wave

SR = 44100


def buf(seconds):
    return [0.0] * int(SR * seconds)


def env_exp(i, n_atk, n_total, vol):
    """WebAudio exponentialRamp 흉내: 0.0001 -> vol (atk), vol -> 0.0001 (끝까지)."""
    if i < n_atk:
        return 0.0001 * (vol / 0.0001) ** (i / max(1, n_atk))
    k = (i - n_atk) / max(1, n_total - n_atk)
    return vol * (0.0001 / vol) ** k


def osc(kind, phase):
    p = phase % 1.0
    if kind == "sine":
        return math.sin(2 * math.pi * p)
    if kind == "square":
        return 1.0 if p < 0.5 else -1.0
    if kind == "triangle":
        return 4 * abs(p - 0.5) - 1
    if kind == "sawtooth":
        return 2 * p - 1
    raise ValueError(kind)


def tone(out, f, dur, kind="sine", vol=0.2, delay=0.0, to=None, atk=0.006):
    n = int(dur * SR)
    start = int(delay * SR)
    n_atk = int(atk * SR)
    ph = 0.0
    for i in range(n):
        j = start + i
        if j >= len(out):
            break
        t = i / max(1, n - 1)
        freq = f * (to / f) ** t if to else f
        ph += freq / SR
        out[j] += osc(kind, ph) * env_exp(i, n_atk, n, vol)


class Biquad:
    """RBJ 쿡북 필터 (bandpass / lowpass / highpass)."""

    def __init__(self, kind, freq, q=1.0):
        self.kind, self.q = kind, q
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0
        self.set(freq)

    def set(self, freq):
        w = 2 * math.pi * min(freq, SR * 0.45) / SR
        cw, sw = math.cos(w), math.sin(w)
        a = sw / (2 * self.q)
        if self.kind == "bandpass":
            b0, b1, b2 = a, 0.0, -a
        elif self.kind == "lowpass":
            b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        else:  # highpass
            b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
        a0, a1, a2 = 1 + a, -2 * cw, 1 - a
        self.b = (b0 / a0, b1 / a0, b2 / a0)
        self.a = (a1 / a0, a2 / a0)

    def __call__(self, x):
        b0, b1, b2 = self.b
        a1, a2 = self.a
        y = b0 * x + b1 * self.x1 + b2 * self.x2 - a1 * self.y1 - a2 * self.y2
        self.x2, self.x1, self.y2, self.y1 = self.x1, x, self.y1, y
        return y


def noise(out, dur, vol=0.2, delay=0.0, freq=1200.0, kind="bandpass", to=None, rng=None):
    rng = rng or random.Random(7)
    n = int(dur * SR)
    start = int(delay * SR)
    flt = Biquad(kind, freq, 0.9)
    for i in range(n):
        j = start + i
        if j >= len(out):
            break
        if to:
            flt.set(freq * (to / freq) ** (i / max(1, n - 1)))
        g = vol * (0.0001 / vol) ** (i / max(1, n - 1))
        out[j] += flt(rng.uniform(-1, 1)) * g * 2.0


def reverb(sig, mix=0.25, seconds=1.2):
    """작은 슈뢰더 잔향 (빗살 4 + 올패스 2). 꼬리를 위해 길이를 늘린다."""
    out = sig + [0.0] * int(seconds * SR)
    wet = [0.0] * len(out)
    for d_ms, fb in ((29.7, 0.77), (37.1, 0.75), (41.1, 0.73), (43.7, 0.71)):
        d = int(d_ms * SR / 1000)
        line = [0.0] * len(out)
        for i in range(len(out)):
            x = out[i] if i < len(sig) else 0.0
            line[i] = x + (line[i - d] * fb if i >= d else 0.0)
            wet[i] += line[i] * 0.25
    for d_ms, g in ((5.0, 0.7), (1.7, 0.7)):
        d = int(d_ms * SR / 1000)
        y = [0.0] * len(wet)
        for i in range(len(wet)):
            xd = wet[i - d] if i >= d else 0.0
            yd = y[i - d] if i >= d else 0.0
            y[i] = -g * wet[i] + xd + g * yd
        wet = y
    return [(out[i] if i < len(sig) else 0.0) + wet[i] * mix for i in range(len(out))]


def trim_tail(sig, floor=1e-4):
    last = len(sig) - 1
    while last > 0 and abs(sig[last]) < floor:
        last -= 1
    return sig[: last + 1 + int(0.01 * SR)]


def write(path, sig, peak=0.89):
    m = max(1e-9, max(abs(v) for v in sig))
    k = peak / m
    fade = int(0.005 * SR)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for i, v in enumerate(sig):
            if i > len(sig) - fade:
                v *= (len(sig) - i) / fade
            frames += struct.pack("<h", int(max(-1.0, min(1.0, v * k)) * 32767))
        w.writeframes(bytes(frames))


def make_all(folder):
    os.makedirs(folder, exist_ok=True)
    rng = random.Random(4242)
    made = {}

    # 공격: 프로토타입 hit (네모파 170->70 + 대역 잡음 900) 에 낮은 쿵을 더한 타격음
    s = buf(0.32)
    tone(s, 170, 0.09, "square", 0.06, to=70)
    noise(s, 0.06, 0.14, freq=900, rng=rng)
    tone(s, 120, 0.22, "sine", 0.30, to=48)
    noise(s, 0.03, 0.10, freq=3200, kind="highpass", rng=rng)
    made["atk"] = trim_tail(s)

    # 받기: 프로토타입 guard (삼각파 620 + 고역 잡음 4000) + 쇳소리 배음
    s = buf(0.7)
    tone(s, 620, 0.12, "triangle", 0.14)
    noise(s, 0.05, 0.10, freq=4000, rng=rng)
    for f, v, d in ((1318.5, 0.08, 0.5), (1975.5, 0.05, 0.42), (2793.0, 0.03, 0.3), (3712.0, 0.02, 0.22)):
        tone(s, f, d, "sine", v)
    made["rcv"] = trim_tail(reverb(s, 0.22, 0.8))

    # 합: 도·미·솔 화음 (삼각파) + 낮은 쿵 (90->45) + 잡음, 잔향
    s = buf(1.0)
    for f in (523.25, 659.25, 783.99):
        tone(s, f, 0.55, "triangle", 0.12)
    tone(s, 1046.5, 0.5, "sine", 0.04, delay=0.01)
    tone(s, 90, 0.35, "sine", 0.35, to=45)
    noise(s, 0.12, 0.22, freq=700, rng=rng)
    made["hap"] = trim_tail(reverb(s, 0.3, 1.2))

    # 메뉴 이동: 짧은 똑
    s = buf(0.08)
    tone(s, 1567.98, 0.05, "triangle", 0.10)
    tone(s, 2349.3, 0.035, "sine", 0.04, delay=0.005)
    made["tick"] = trim_tail(s)

    # 보스 내려찍기: 프로토타입 slam (70->35 + 저역 잡음 300)
    s = buf(0.5)
    tone(s, 70, 0.4, "sine", 0.4, to=35)
    noise(s, 0.3, 0.22, freq=300, kind="lowpass", rng=rng)
    made["slam"] = trim_tail(s)

    # 참가 / 나가기 / 거절
    s = buf(0.3)
    tone(s, 783.99, 0.18, "triangle", 0.10)
    tone(s, 1174.66, 0.22, "triangle", 0.08, delay=0.06)
    made["join"] = trim_tail(s)
    s = buf(0.3)
    tone(s, 1174.66, 0.16, "triangle", 0.08)
    tone(s, 783.99, 0.2, "triangle", 0.09, delay=0.06)
    made["leave"] = trim_tail(s)
    s = buf(0.3)
    tone(s, 330, 0.15, "triangle", 0.07)
    tone(s, 247, 0.22, "triangle", 0.07, delay=0.12)
    made["reject"] = trim_tail(s)

    for name, sig in made.items():
        write(os.path.join(folder, name + ".wav"), sig)
    return sorted(made)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "assets", "sfx")
    names = make_all(dst)
    print("sfx:", " ".join(n + ".wav" for n in names), "->", os.path.normpath(dst))
