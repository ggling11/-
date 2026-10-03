# G1 · G2 · X4 측정: python3 metrics.py 이미지... [--crop game|full] [--json out.json]
#   G1: sat · val · black · white · flat 다섯 개 중 4개 이상에서 '3단계 워든 → 레퍼런스' 차이를 60% 이상 줄임
#   G2: 새 화면 팔레트 → 레퍼런스 팔레트 거리 ≤ 0.066 (Oklab, 3단계 compare.py와 같은 식 = ref4_stats.pal_dist)
#   X4: 3단계 워든 화면 팔레트 → 새 화면 팔레트 거리 ≥ 0.066 (기준선 0.0948 × 0.7)
import sys, os, json
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', 'style'))
from ref4_stats import style_stats, kmeans, pal_dist, load
REFJ = json.load(open(os.path.join(HERE, '..', 'style', 'ref4', 'ref4_stats.json'), encoding='utf8'))
REF = REFJ['s1_anime_cel']; BASE = REFJ['_baseline']
hx = lambda c: [int(c[i:i + 2], 16) for i in (1, 3, 5)]
RC = np.array([hx(c) for c in REF['pal']], float)
def warden_pal():   # 3단계 워든 화면 대표색 (ref4_stats와 같은 방식으로 다시 계산)
    f = os.path.join(HERE, '..', 'results', 's3', 'art', 'B2_warden.png'); a = load(f)
    return kmeans(a[int(a.shape[0] * 0.12):int(a.shape[0] * 0.76):6, ::6].reshape(-1, 3), 10)
def measure(files, crop='game'):
    cr = (0.12, 0.76, 0.04, 0.96) if crop == 'game' else None
    st = [style_stats(f, cr) for f in files]
    avg = {k: round(float(np.mean([s[k] for s in st])), 3) for k in ('sat', 'val', 'black', 'white', 'red', 'blue', 'flat')}
    pool = []
    for f in files:
        a = load(f)
        if cr: H, W = a.shape[:2]; a = a[int(H * cr[0]):int(H * cr[1]), int(W * cr[2]):int(W * cr[3])]
        pool.append(a[::6, ::6].reshape(-1, 3))
    NC, NW = kmeans(np.concatenate(pool), 10)
    g2 = pal_dist(NC, NW, RC)
    WC, WW = warden_pal(); x4 = pal_dist(WC, WW, NC)
    ref, w0 = REF['avg'], BASE['wardenAvg']
    g1 = {}
    for k in ('sat', 'val', 'black', 'white', 'flat'):
        d0 = abs(w0[k] - ref[k]); d1 = abs(avg[k] - ref[k]); g1[k] = round(1 - d1 / d0, 3) if d0 > 1e-6 else 1.0
    g1_ok = sum(v >= 0.6 for v in g1.values()) >= 4
    return {'avg': avg, 'g1_reduction': g1, 'G1': g1_ok, 'G2': round(g2, 4), 'G2_ok': g2 <= 0.066, 'X4': round(x4, 4), 'X4_ok': x4 >= 0.066,
            'pal': ['#%02x%02x%02x' % tuple(int(x) for x in c) for c in NC], 'w': [round(float(x), 3) for x in NW]}
if __name__ == '__main__':
    av = sys.argv[1:]; skip = {av.index('--json') + 1} if '--json' in av else set()
    args = [a for i, a in enumerate(av) if not a.startswith('--') and i not in skip]; crop = 'full' if '--full' in sys.argv else 'game'
    out = measure(args, crop)
    print(json.dumps(out, ensure_ascii=False))
    if '--json' in sys.argv: json.dump(out, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1, ensure_ascii=False)
