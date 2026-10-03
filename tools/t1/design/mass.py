# 테마 1 디자인 시트 v6: '덩어리' 렌더러 — 같은 재질 부품을 하나로 합쳐(래스터 합집합 → 윤곽 → 매끈하게) 큰 덩어리로 그린다
#   레퍼런스 디자인 언어: 큰 덩어리 하나(머리카락 · 코트 · 털 몸) + 날카로운 끝 몇 개 + 확신 있는 깨끗한 선 + 각진/털뭉치 그림자 조각
#   3D 점 → 투영은 figure.Cam 그대로 (정면 3/4 · 측면 · 게임 카메라가 서로 맞음)
import math
import numpy as np, cv2
from figure import Cam, catmull, INK, PAPER, SH, SH2, SKIN, SKSH, BLUE, RED, GOLD, HI, add, lerp
SS = 4   # 래스터 배율 (윤곽 정밀도)

def chaikin_keep(pts, it=2, sharp=55):
    """모서리 각이 sharp°보다 뾰족한 점(머리카락 끝 · 코트 끝)은 남기고 나머지는 둥글게"""
    P = pts
    for _ in range(it):
        n = len(P); out = []
        for i in range(n):
            a, b, c = P[i - 1], P[i], P[(i + 1) % n]
            v1, v2 = (a[0] - b[0], a[1] - b[1]), (c[0] - b[0], c[1] - b[1])
            l1, l2 = math.hypot(*v1) or 1, math.hypot(*v2) or 1
            ang = math.degrees(math.acos(max(-1, min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))))
            if ang < sharp: out.append(b); continue
            out.append((0.75 * b[0] + 0.25 * a[0], 0.75 * b[1] + 0.25 * a[1])); out.append((0.75 * b[0] + 0.25 * c[0], 0.75 * b[1] + 0.25 * c[1]))
        P = out
    return P

def mask_paths(mask, eps=0.9, sharp=55, min_area=6):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if cv2.contourArea(c) < min_area * SS * SS: continue
        a = cv2.approxPolyDP(c, eps * SS, True)[:, 0, :].astype(float) / SS
        if len(a) < 3: continue
        a = chaikin_keep([tuple(p) for p in a], 2, sharp)
        d.append('M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in a) + ' Z')
    return ' '.join(d)

class MFig:
    def __init__(self, cam, W, H, groups):
        """groups: [(이름, 채움색, 선 굵기, 그림자색 또는 None)] — 뒤에서 앞 순서"""
        self.c = cam; self.W, self.H = W, H; self.order = [g[0] for g in groups]; self.G = {g[0]: g for g in groups}
        self.m = {g[0]: np.zeros((H * SS, W * SS), np.uint8) for g in groups}
        self.sh = {g[0]: np.zeros((H * SS, W * SS), np.uint8) for g in groups}
        self.lines = {g[0]: [] for g in groups}
    def _pts(self, pts3): return [self.c.P(p) for p in pts3]
    def _fill(self, M, Q):
        cv2.fillPoly(M, [np.round(np.array(Q) * SS).astype(np.int32)], 255, lineType=cv2.LINE_8)
    def ribbon(self, g, pts3, widths, n=8, shade=None):
        P = self._pts(pts3); C = catmull([(p[0], p[1]) for p in P], n); Wd = catmull([(w,) for w in widths], n)
        L, R = [], []
        for i in range(len(C)):
            a = C[max(0, i - 1)]; b = C[min(len(C) - 1, i + 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1; nx, ny = -ty / l, tx / l
            w = Wd[i][0] * self.c.s / 2
            L.append((C[i][0] + nx * w, C[i][1] + ny * w)); R.append((C[i][0] - nx * w, C[i][1] - ny * w))
        self._fill(self.m[g], L + R[::-1])
        if shade:   # 'L' | 'R' : 그 쪽 가장자리에서 안쪽 frac까지 그림자 (각진 띠)
            side, frac = shade
            S = L if side == 'L' else R
            inner = [(c[0] + (s[0] - c[0]) * (1 - frac), c[1] + (s[1] - c[1]) * (1 - frac)) for c, s in zip(C, S)]
            self._fill(self.sh[g], S + inner[::-1])
    def blob(self, g, pts3, smooth=True):
        P = self._pts(pts3); Q = catmull([(p[0], p[1]) for p in P], 6, closed=True) if smooth else [(p[0], p[1]) for p in P]
        self._fill(self.m[g], Q)
    def shade(self, g, pts3, smooth=False, fur=0.0, seed=1):
        P = self._pts(pts3); Q = catmull([(p[0], p[1]) for p in P], 4, closed=True) if smooth else [(p[0], p[1]) for p in P]
        if fur:   # 털뭉치 경계: 큰 뭉치 몇 개 (같은 모양 반복 아님)
            rng = np.random.default_rng(seed); out = []
            for i in range(len(Q)):
                a, b = Q[i], Q[(i + 1) % len(Q)]; out.append(a)
                L = math.hypot(b[0] - a[0], b[1] - a[1]); k = int(L / (fur * 2.2))
                for j in range(1, k + 1):
                    t = j / (k + 1); mx, my = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                    nx, ny = (b[1] - a[1]) / (L or 1), -(b[0] - a[0]) / (L or 1)
                    amp = fur * (0.3 + rng.random()) * (1 if j % 2 else -0.4)
                    out.append((mx + nx * amp, my + ny * amp))
            Q = out
        self._fill(self.sh[g], Q)
    def line(self, g, pts3, sw=1.2, col=INK, closed=False, fill=None):
        P = self._pts(pts3); Q = catmull([(p[0], p[1]) for p in P], 5) if not closed else [(p[0], p[1]) for p in P]
        d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in Q) + (' Z' if closed else '')
        self.lines[g].append(f'<path d="{d}" fill="{fill or "none"}" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>')
    def svg(self, x=0, y=0):
        out = []
        for g in self.order:
            _, fill, sw, shc = self.G[g]
            M = cv2.morphologyEx(self.m[g], cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
            if M.any():
                d = mask_paths(M)
                out.append(f'<path d="{d}" fill="{fill}" fill-rule="evenodd" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke"/>')
                if shc:
                    S = cv2.bitwise_and(self.sh[g], cv2.erode(M, np.ones((3, 3), np.uint8)))
                    if S.any(): out.append(f'<path d="{mask_paths(S, 0.7, 40, 3)}" fill="{shc}" fill-rule="evenodd" stroke="none"/>')
                    out.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw * 0.55:.2f}" stroke-linejoin="round"/>')
            out.extend(self.lines[g])
        return f'<g transform="translate({x},{y})">' + ''.join(out) + '</g>'

# ---- 부피 도형: 어느 시점에서도 덩어리가 유지되게 (평면 점 고리는 측면에서 납작해짐)
def _hull(Q):
    h = cv2.convexHull(np.array(Q, np.float32)); return [tuple(p) for p in h[:, 0, :]]
def _ell_pts(c, r, n=14):
    out = []
    for i in range(n):
        th = math.pi * (i + 0.5) / n
        for j in range(2 * n):
            ph = 2 * math.pi * j / (2 * n)
            out.append((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] + r[1] * math.cos(th), c[2] + r[2] * math.sin(th) * math.sin(ph)))
    return out
def ellipsoid(self, g, c, r, shade=None):
    """타원체 → 투영 → 볼록 껍질. shade = 빛 반대쪽 그림자 비율(0~1) — 같은 타원체를 빛 반대로 밀어 겹친 부분 바깥을 그림자로"""
    P = [self.c.P(p) for p in _ell_pts(c, r)]; Q = _hull([(p[0], p[1]) for p in P]); self._fill(self.m[g], Q)
    if shade:
        from figure import LN
        off = (c[0] - LN[0] * r[0] * shade * 2, c[1] - LN[1] * r[1] * shade * 2, c[2] - LN[2] * r[2] * shade * 2)
        lit = _hull([(p[0], p[1]) for p in [self.c.P(q) for q in _ell_pts(off, r)]])
        A = np.zeros_like(self.sh[g]); self._fill(A, Q); B = np.zeros_like(A); self._fill(B, lit)
        L = cv2.bitwise_and(A, cv2.bitwise_not(B))   # 빛 쪽으로 밀린 껍질에 안 덮인 쪽 = 그림자
        lit2 = [(c[0] + LN[0] * r[0] * shade * 2, c[1] + LN[1] * r[1] * shade * 2, c[2] + LN[2] * r[2] * shade * 2)]
        Bl = np.zeros_like(A); self._fill(Bl, _hull([(p[0], p[1]) for p in [self.c.P(q) for q in _ell_pts(lit2[0], r)]]))
        self.sh[g] = cv2.bitwise_or(self.sh[g], cv2.bitwise_and(A, cv2.bitwise_not(Bl)))
def loft(self, g, rings, spikes=None):
    """고리 [(y, cx, cz, rx, rz)] 사이를 볼록 껍질로 이음 (코트 · 치마 · 몸통 덩어리). spikes = 마지막 고리 아래로 뾰족한 끝 [(각도, 길이)]"""
    def ring(y, cx, cz, rx, rz, n=16): return [(cx + rx * math.cos(2 * math.pi * k / n), y, cz + rz * math.sin(2 * math.pi * k / n)) for k in range(n)]
    for a, b in zip(rings, rings[1:]):
        P = [self.c.P(p) for p in ring(*a) + ring(*b)]; self._fill(self.m[g], _hull([(p[0], p[1]) for p in P]))
    if spikes:
        y, cx, cz, rx, rz = rings[-1]
        for ang, L, w in spikes:
            p0 = (cx + rx * math.cos(ang - w), y, cz + rz * math.sin(ang - w)); p1 = (cx + rx * math.cos(ang + w), y, cz + rz * math.sin(ang + w))
            tip = (cx + rx * 1.12 * math.cos(ang), y - L, cz + rz * 1.12 * math.sin(ang)); up = (cx + rx * 0.9 * math.cos(ang), y + 0.12, cz + rz * 0.9 * math.sin(ang))
            self._fill(self.m[g], [(q[0], q[1]) for q in [self.c.P(p) for p in (p0, up, p1, tip)]])
MFig.ellipsoid = ellipsoid; MFig.loft = loft
