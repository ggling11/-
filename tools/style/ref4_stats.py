# 4단계 레퍼런스 DB: 스타일 4종의 색 · 질감 통계 + 비교 시트
#   python3 ref4_stats.py            → ref4/ref4_stats.json · ref4/ref4_sheet.png
#   이미지별: 대표색 8개(k-means) · 평균 채도 · 평균 밝기 · 검정 비중 · 흰색 비중 · 빨강/파랑 강조 비중
#            · 평평한 면 비중(3×3 이웃 차이가 거의 없는 픽셀 — 셀/도트는 높고, 실사/페인터리는 낮음) · 고유 색 수 · 도트 배율 추정
#   스타일별: 위 값의 평균 + 묶음 대표색 10개
#   4단계 게이트에서 같은 함수로 게임 화면을 재서 비교한다 (style_stats(path) 를 import 해서 씀)
import sys, json, glob, os, colorsys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); REF = os.path.join(HERE, 'ref4')
STYLES = [('s1_anime_cel', '1 애니 셀 (나이트런)'), ('s2_pixel', '2 도트'), ('s3_dark_real', '3 다크 실사'), ('s4_painterly', '4 페인터리'), ('s5_deathsdoor', '5 데스도어')]
# 이미지가 아직 없는 스타일 폴더는 건너뛴다 (5 데스도어: 디렉터가 게임 화면을 넣으면 그때 잰다)
STYLES = [(k, n) for k, n in STYLES if os.path.isdir(os.path.join(REF, k)) and any(f.lower().endswith(('.jpg', '.png', '.gif', '.webp')) for f in os.listdir(os.path.join(REF, k)))]

def load(path):
    im = Image.open(path)
    if getattr(im, 'n_frames', 1) > 1: im.seek(0)
    im = im.convert('RGB')
    if max(im.size) > 900: im = im.resize((im.width * 900 // max(im.size), im.height * 900 // max(im.size)), Image.NEAREST)
    return np.asarray(im).astype(float)

def kmeans(X, k, it=20, seed=1):
    rng = np.random.default_rng(seed); C = X[rng.choice(len(X), k, replace=False)].copy()
    for _ in range(it):
        l = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            if (l == j).any(): C[j] = X[l == j].mean(0)
    l = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
    w = np.bincount(l, minlength=k) / len(X); o = np.argsort(-w)
    return C[o], w[o]

def srgb2lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def oklab(rgb):
    c = srgb2lin(np.asarray(rgb, float))
    l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]
    m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]
    s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)
def pal_dist(A, wA, B):                  # A 색마다 B에서 가장 가까운 색까지 Oklab 거리, A 비중으로 가중 평균 (3단계 compare.py 와 같은 식)
    la, lb = oklab(A), oklab(B)
    return float((np.sqrt(((la[:, None, :] - lb[None]) ** 2).sum(-1)).min(1) * np.asarray(wA)).sum())

def pixel_scale(a):                      # 같은 색이 정사각 블록으로 반복되는 크기 (1 = 도트 아님 / 원본 배율)
    best = 1
    for s in range(2, 9):
        H, W = (a.shape[0] // s) * s, (a.shape[1] // s) * s
        b = a[:H, :W].reshape(H // s, s, W // s, s, 3)
        err = np.abs(b - b[:, :1, :, :1]).mean()
        if err < 2.0: best = s
    return best

def style_stats(path, crop=None):
    a = load(path)
    if crop: H, W = a.shape[:2]; a = a[int(H * crop[0]):int(H * crop[1]), int(W * crop[2]):int(W * crop[3])]
    X = a[::3, ::3].reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in X[::4]])
    h, s, v = hsv[:, 0] * 360, hsv[:, 1], hsv[:, 2]
    g = a.mean(-1); d = np.zeros_like(g)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): d = np.maximum(d, np.abs(g - np.roll(np.roll(g, dy, 0), dx, 1)))
    C, w = kmeans(X, 8)
    q = (a[::2, ::2] // 8).astype(int); uniq = len(np.unique(q[..., 0] * 1024 + q[..., 1] * 32 + q[..., 2]))
    return {
        'pal': ['#%02x%02x%02x' % tuple(int(x) for x in c) for c in C], 'w': [round(float(x), 3) for x in w],
        'sat': round(float(s.mean()), 3), 'val': round(float(v.mean()), 3),
        'black': round(float((v < 0.13).mean()), 3), 'white': round(float(((v > 0.9) & (s < 0.08)).mean()), 3),
        'red': round(float((((h > 335) | (h < 15)) & (s > 0.5) & (v > 0.3)).mean()), 3),
        'blue': round(float(((h > 190) & (h < 250) & (s > 0.4) & (v > 0.25)).mean()), 3),
        'flat': round(float((d[1:-1, 1:-1] < 6).mean()), 3), 'colors': int(uniq), 'pxScale': pixel_scale(a),
    }

if __name__ == '__main__':
    out = {}
    for key, name in STYLES:
        files = sorted(f for f in glob.glob(os.path.join(REF, key, '*')) if f.lower().endswith(('.jpg', '.png', '.gif', '.webp')))
        per = {os.path.basename(f): style_stats(f) for f in files}
        pool = np.concatenate([load(f)[::6, ::6].reshape(-1, 3) for f in files])
        C, w = kmeans(pool, 10)
        avg = {k: round(float(np.mean([p[k] for p in per.values()])), 3) for k in ('sat', 'val', 'black', 'white', 'red', 'blue', 'flat', 'colors')}
        out[key] = {'name': name, 'files': per, 'avg': avg, 'pal': ['#%02x%02x%02x' % tuple(int(x) for x in c) for c in C], 'w': [round(float(x), 3) for x in w]}
        print(name, json.dumps(avg, ensure_ascii=False), out[key]['pal'][:6], flush=True)
    # 기준선: 지금 빌드(3단계) 전투 화면 4장 → 스타일별 Oklab 팔레트 거리 (작을수록 가까움). 4단계 게이트 = 새 화면 거리 < 이 값
    game = sorted(glob.glob(os.path.join(HERE, '..', 'results', 's3', 'art', 'B*_*.png')))
    if game:
        gp = np.concatenate([load(f)[int(1080 * 0.12 * 900 / 1920):int(1080 * 0.76 * 900 / 1920):6, ::6].reshape(-1, 3) for f in game])
        GC, GW = kmeans(gp, 10)
        wf = [f for f in game if os.path.basename(f).startswith('B2_')]   # 3단계 워든 화면만 (빠른 테스트판 기준선)
        WC, WW = kmeans(np.concatenate([load(f)[int(load(f).shape[0] * 0.12):int(load(f).shape[0] * 0.76):6, ::6].reshape(-1, 3) for f in wf]), 10)
        out['_baseline'] = {'files': [os.path.basename(f) for f in game], 'pal': ['#%02x%02x%02x' % tuple(int(x) for x in c) for c in GC], 'w': [round(float(x), 3) for x in GW],
                            'gameToStyle': {}, 'styleToStyle': {}}
        for key, _ in STYLES:
            S = out[key]; SC = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in S['pal']], float)
            out['_baseline']['gameToStyle'][key] = round(pal_dist(GC, GW, SC), 4)
            out['_baseline'].setdefault('wardenToStyle', {})[key] = round(pal_dist(WC, WW, SC), 4)   # 빠른 테스트판(보스 = 워든)용 기준선
            for k2, _ in STYLES:
                if k2 <= key: continue
                S2 = out[k2]; SC2 = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in S2['pal']], float)
                out['_baseline']['styleToStyle'][f'{key}>{k2}'] = round(pal_dist(SC, np.array(S['w']), SC2), 4)
        gs = [style_stats(f, crop=(0.12, 0.76, 0.04, 0.96)) for f in game]   # 게임 화면은 HUD 빼고 가운데만
        out['_baseline']['avg'] = {k: round(float(np.mean([g[k] for g in gs])), 3) for k in ('sat', 'val', 'black', 'white', 'red', 'blue', 'flat', 'colors')}
        # 도트(s2)는 배경 두 갈래를 따로: 평면 = s2_03~05 ↔ 3단계 보스 1·2 화면, 빈 공간 = s2_01·02 ↔ 3단계 보스 3·4 화면
        br = {}
        for bname, rfs, gfs in [('flat', ['s2_03.png', 's2_04.png', 's2_05.png'], ['B1_', 'B2_']), ('void', ['s2_01.gif', 's2_02.gif'], ['B3_', 'B4_'])]:
            rf = [os.path.join(REF, 's2_pixel', f) for f in rfs]; gf2 = [f for f in game if any(os.path.basename(f).startswith(p) for p in gfs)]
            RC, RW = kmeans(np.concatenate([load(f)[::6, ::6].reshape(-1, 3) for f in rf]), 10)
            GC2, GW2 = kmeans(np.concatenate([load(f)[int(load(f).shape[0] * 0.12):int(load(f).shape[0] * 0.76):6, ::6].reshape(-1, 3) for f in gf2]), 10)
            st = [style_stats(f) for f in rf]
            br[bname] = {'refs': rfs, 'game': [os.path.basename(f) for f in gf2], 'gameToBranch': round(pal_dist(GC2, GW2, RC), 4), 'wardenToBranch': round(pal_dist(WC, WW, RC), 4),
                         'avg': {k: round(float(np.mean([q[k] for q in st])), 3) for k in ('sat', 'val', 'black', 'white', 'blue', 'flat')}}
        out['_baseline']['s2_branches'] = br
        print('s2 branches', json.dumps(br))
        gw = [style_stats(f, crop=(0.12, 0.76, 0.04, 0.96)) for f in wf]
        out['_baseline']['wardenAvg'] = {k: round(float(np.mean([g[k] for g in gw])), 3) for k in ('sat', 'val', 'black', 'white', 'red', 'blue', 'flat', 'colors')}
        print('warden', json.dumps(out['_baseline']['wardenAvg']), json.dumps(out['_baseline']['wardenToStyle']))
        print('baseline', json.dumps(out['_baseline']['avg']), json.dumps(out['_baseline']['gameToStyle']), json.dumps(out['_baseline']['styleToStyle']))
    json.dump(out, open(os.path.join(REF, 'ref4_stats.json'), 'w'), ensure_ascii=False, indent=1)
    # 비교 시트: 스타일마다 한 줄 (썸네일 + 대표색 띠 + 수치)
    TH, rows = 220, []
    for key, name in STYLES:
        files = sorted(f for f in glob.glob(os.path.join(REF, key, '*')) if f.lower().endswith(('.jpg', '.png', '.gif', '.webp')))
        th = []
        for f in files:
            im = Image.open(f); im.seek(0) if getattr(im, 'n_frames', 1) > 1 else None; im = im.convert('RGB')
            th.append(im.resize((max(1, im.width * TH // im.height), TH), Image.NEAREST if 'pixel' in key else Image.LANCZOS))
        W = sum(t.width for t in th) + 8 * len(th); row = Image.new('RGB', (max(W, 900), TH + 70), (24, 24, 28)); x = 0
        for t in th: row.paste(t, (x, 0)); x += t.width + 8
        dr = ImageDraw.Draw(row); S = out[key]; x = 0
        for c, ww in zip(S['pal'], S['w']):
            wpx = max(6, int(ww * 600)); dr.rectangle([x, TH + 6, x + wpx, TH + 30], fill=c); x += wpx
        A = S['avg']
        dr.text((4, TH + 38), f"{key}  sat {A['sat']}  val {A['val']}  black {A['black']}  white {A['white']}  red {A['red']}  blue {A['blue']}  flat {A['flat']}  colors {int(A['colors'])}", fill=(230, 230, 230))
        rows.append(row)
    W = max(r.width for r in rows); sheet = Image.new('RGB', (W, sum(r.height + 12 for r in rows)), (24, 24, 28)); y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height + 12
    if sheet.width > 3200: sheet = sheet.resize((3200, sheet.height * 3200 // sheet.width), Image.LANCZOS)
    sheet.save(os.path.join(REF, 'ref4_sheet.png')); print('sheet', sheet.size)
