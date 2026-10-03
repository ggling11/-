# 테마 1 디자인 시트 v3+: 3D 관절 퍼펫 → 2D 벡터 (끝이 가늘어지는 리본 · 매끈한 덩어리 · 셀 그림자 1단 · 굵기가 변하는 선)
#   한 캐릭터를 3D 점(관절 · 옷자락 · 머리 가닥)으로 정의하고 정면 3/4 · 측면 · 게임 카메라(47° 내려다봄)로 투영한다
#   → 세 시점이 서로 맞고, 같은 비율 데이터를 랩의 3D 모델이 그대로 쓴다 (T1.model 비율의 출발점)
import math, random
INK, PAPER, SH, SH2, SKIN, SKSH = '#141112', '#fdfbfb', '#b0a3a5', '#d9d2d3', '#f6e6e3', '#ddb2b4'
BLUE, RED, GOLD, HI = '#2350b8', '#c8102e', '#b8995a', '#e4dcdd'
LIGHT = (-0.55, 0.65, 0.52)   # 빛 방향 (월드: 왼쪽 위 앞) — 셀 그림자 1단

def norm(v): l = math.sqrt(sum(c * c for c in v)) or 1; return tuple(c / l for c in v)
def add(a, b): return tuple(x + y for x, y in zip(a, b))
def sub(a, b): return tuple(x - y for x, y in zip(a, b))
def mul(a, s): return tuple(x * s for x in a)
def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def dot(a, b): return sum(x * y for x, y in zip(a, b))
LN = norm(LIGHT)

class Cam:
    def __init__(self, yaw=0.0, pitch=0.0, scale=200.0, ox=100.0, oy=390.0):
        self.cy, self.sy = math.cos(yaw), math.sin(yaw); self.cp, self.sp = math.cos(pitch), math.sin(pitch)
        self.s, self.ox, self.oy = scale, ox, oy
    def view(self, p):           # 모델을 yaw만큼 돌리고 pitch로 내려다봄 → (x, y_up, depth)
        x, y, z = p
        xr = x * self.cy + z * self.sy; zr = -x * self.sy + z * self.cy
        return (xr, y * self.cp - zr * self.sp, zr * self.cp + y * self.sp)
    def P(self, p):
        x, y, d = self.view(p); return (self.ox + x * self.s, self.oy - y * self.s, d)
    def vdir(self, v):           # 월드 방향 → 화면 방향 (그림자 판단용 법선)
        x, y, z = v; xr = x * self.cy + z * self.sy; zr = -x * self.sy + z * self.cy
        return (xr, y * self.cp - zr * self.sp, zr * self.cp + y * self.sp)

def catmull(pts, n=8, closed=False):
    out = []; P = pts[:]
    if closed: P = [pts[-1]] + pts + [pts[0], pts[1]]
    else: P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3) for a, b, c, d in zip(p0, p1, p2, p3)))
    if not closed: out.append(P[-2])
    return out

def path_of(pts, closed=True):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if closed else '')

class Fig:
    """부품 목록 (깊이 정렬) → SVG. 부품 = (깊이, svg 문자열)"""
    def __init__(self, cam, seed=1):
        self.c = cam; self.parts = []; self.rng = random.Random(seed); Fig._cid = Fig._cid + 1000 * seed + int(cam.ox)
    def add(self, depth, svg): self.parts.append((depth, svg))
    def svg(self): return ''.join(s for _, s in sorted(self.parts, key=lambda q: q[0]))
    def _stroke(self, sw): return sw * (0.85 + 0.3 * self.rng.random())   # 굵기 흔들림 ±15% (부품마다)
    # 리본: 중심선(3D 점) + 폭(월드) → 끝이 가늘어지는 면. shade=True면 빛 반대쪽 절반을 그림자 색으로
    def ribbon(self, pts3, widths, fill, sw=1.6, shade=True, sh=None, bias=0.0, n=6, tip=True):
        c = self.c; P = [c.P(p) for p in pts3]; W = widths
        C = catmull([(p[0], p[1]) for p in P], n); Wd = catmull([(w,) for w in W], n)
        depth = sum(p[2] for p in P) / len(P) + bias
        L, R, M = [], [], []
        for i in range(len(C)):
            a = C[max(0, i - 1)]; b = C[min(len(C) - 1, i + 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1; nx, ny = -ty / l, tx / l
            w = Wd[i][0] * c.s / 2
            L.append((C[i][0] + nx * w, C[i][1] + ny * w)); R.append((C[i][0] - nx * w, C[i][1] - ny * w)); M.append(C[i])
        poly = L + R[::-1]
        out = self.inked(path_of(poly), fill, sw)
        if shade and fill != INK:
            # 화면 법선이 빛 반대를 보는 쪽 절반 (중심선에서 살짝 안쪽까지)
            lx, ly = c.vdir(LN)[0], -c.vdir(LN)[1]
            a = C[0]; b = C[-1]; tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1; nx, ny = -ty / l, tx / l
            side = R if nx * lx + ny * ly > 0 else L
            # 각진 그림자 조각: 안쪽 경계를 몇 칸마다 꺾어 자름 (그라데이션 없음 · 같은 모양 반복 아님)
            k = [0.25 + 0.35 * self.rng.random() for _ in range(len(M))]
            for i in range(1, len(k)): k[i] = k[i - 1] if self.rng.random() < 0.55 else k[i]
            inner = [(m[0] + (q[0] - m[0]) * kk, m[1] + (q[1] - m[1]) * kk) for m, q, kk in zip(M, side, k)]
            shp = side + inner[::-1]
            out += f'<path d="{path_of(shp)}" fill="{sh or (SKSH if fill == SKIN else SH)}" stroke="none"/>'
        self.add(depth, out)
    # 덩어리: 3D 점 고리 → 매끈한 닫힌 면. normal 주면 빛과의 각으로 그림자 (전체 or 한쪽 띠)
    def blob(self, pts3, fill, sw=1.6, bias=0.0, smooth=True, shade_pts=None, sh=None, jag=0.0):
        c = self.c; P = [c.P(p) for p in pts3]
        Q = catmull([(p[0], p[1]) for p in P], 5, closed=True) if smooth else [(p[0], p[1]) for p in P]
        if jag: Q = self.jagged(Q, jag)
        depth = sum(p[2] for p in P) / len(P) + bias
        out = self.inked(path_of(Q), fill, sw)
        if shade_pts:
            S = [c.P(p) for p in shade_pts]; SQ = catmull([(p[0], p[1]) for p in S], 4, closed=True) if smooth else [(p[0], p[1]) for p in S]
            if jag: SQ = self.jagged(SQ, jag * 0.8)
            out += f'<path d="{path_of(SQ)}" fill="{sh or SH}" stroke="none" clip-path="url(#c{self._cid})"/>'
            out = f'<clipPath id="c{self._cid}"><path d="{path_of(Q)}"/></clipPath>' + out; self._cid += 1
        self.add(depth, out)
    _cid = 0
    def inked(self, d, fill, sw):
        """굵기가 변하는 손그림 선: 검정 밑판(굵은 선 + 흔들림 필터) 위에 면을 얹음 → 선 굵기가 자리마다 달라짐"""
        if not sw: return f'<path d="{d}" fill="{fill}" stroke="none"/>'
        w = self._stroke(sw) * 2.0
        return (f'<path d="{d}" fill="{INK}" stroke="{INK}" stroke-width="{w:.2f}" stroke-linejoin="round" filter="url(#wob)"/>'
                f'<path d="{d}" fill="{fill}" stroke="none"/>')
    def jagged(self, Q, amt):   # 털 끝: 불규칙한 뾰족 (같은 모양 반복이 아니게 난수 간격 · 길이)
        out = []; i = 0; n = len(Q)
        while i < n:
            out.append(Q[i]); step = self.rng.randint(2, 4)
            if self.rng.random() < 0.55 and i + step < n:
                a, b = Q[i], Q[min(n - 1, i + step)]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1
                k = amt * (0.4 + self.rng.random()); out.append((mx + ty / l * k + tx / l * k * 0.6, my - tx / l * k + ty / l * k * 0.6))
            i += step
        return out
    def line(self, pts3, sw=1.0, col=INK, bias=0.02):
        c = self.c; P = [c.P(p) for p in pts3]
        Q = catmull([(p[0], p[1]) for p in P], 4)
        self.add(sum(p[2] for p in P) / len(P) + bias, f'<path d="{path_of(Q, False)}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round"/>')
    def raw(self, depth, svg): self.add(depth, svg)

# --------------------------------------------------------------------------- 공통 몸 (애니 비율: 7.6등신 · 어깨 좁게 · 다리 길게)
def body_joints(H=1.80, heads=7.6, shoulder=0.165, hip=0.13, weight='R', lean=0.0):
    h = H / heads
    w = 1 if weight == 'R' else -1   # 무게 실린 다리: R = 캐릭터 오른쪽(-x)
    J = {
        'headTop': (0.0 + lean * 0.5, H, 0.0), 'head': (0.0 + lean * 0.5, H - h * 0.48, 0.01), 'chin': (lean * 0.5, H - h, 0.035),
        'neck': (lean * 0.4, H - h * 1.18, 0.0), 'chest': (lean * 0.3, H - h * 1.9, 0.02), 'waist': (0.012 * w, H - h * 3.0, 0.0),
        'pelvis': (0.025 * w, H - h * 3.55, 0.0), 'crotch': (0.02 * w, H - h * 3.95, 0.0),
        'shR': (-shoulder, H - h * 1.42 - 0.012 * w, -0.01), 'shL': (shoulder, H - h * 1.42 + 0.012 * w, -0.01),
        'hipR': (-hip + 0.02 * w, H - h * 3.62 + 0.02 * w, 0.0), 'hipL': (hip + 0.02 * w, H - h * 3.62 - 0.02 * w, 0.0),
    }
    # 무게 다리는 곧게, 다른 다리는 무릎 굽혀 앞으로 · 발끝 바깥
    J['knR'] = (J['hipR'][0] + 0.03 * w, 0.49, 0.01 if w > 0 else 0.06); J['anR'] = (J['hipR'][0] + (0.06 if w > 0 else -0.01), 0.075, 0.0 if w > 0 else 0.03)
    J['knL'] = (J['hipL'][0] - 0.01, 0.50, 0.07 if w > 0 else 0.01); J['anL'] = (J['hipL'][0] + 0.03, 0.08, 0.04 if w > 0 else 0.0)
    J['toeR'] = add(J['anR'], (-0.03, -0.06, 0.14)); J['toeL'] = add(J['anL'], (0.05, -0.065, 0.13))
    return J, h
