# 3단계 아트 비교 시트 + 색 통계: 레퍼런스(ref) · 2단계(old) · 3단계(new)
#   python3 compare.py OUT.png --ref a.png b.png --old c.png d.png --new e.png f.png
#   색 통계: 화면 가운데(HUD 빼고)에서 대표색 10개(k-means) · 평균 채도 · 평균 밝기 → Oklab 팔레트 거리 (작을수록 가까움)
#   결과 표는 OUT.json 에도 씀. 게이트: new→ref 거리 < old→ref 거리
import sys, json, colorsys
import numpy as np
from PIL import Image, ImageDraw
args = sys.argv[1:]; out = args[0]; groups = {'ref': [], 'old': [], 'new': []}; cur = None
for a in args[1:]:
    if a.startswith('--'): cur = a[2:]; continue
    groups[cur].append(a)

def srgb2lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def oklab(rgb):
    c = srgb2lin(np.asarray(rgb, float))
    l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]
    m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]
    s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)
def kmeans(X, k=10, it=18, seed=1):
    rng = np.random.default_rng(seed); C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(it):
        l = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            if (l == j).any(): C[j] = X[l == j].mean(0)
    l = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
    return C, np.bincount(l, minlength=k) / len(X)
def stats(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float); H, W = a.shape[:2]
    a = a[int(H * 0.12):int(H * 0.76), int(W * 0.04):int(W * 0.96)]
    X = a[::5, ::5].reshape(-1, 3)
    C, w = kmeans(X)
    hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in X[::9]])
    return {'pal': C, 'w': w, 'sat': float(hsv[:, 1].mean()), 'val': float(hsv[:, 2].mean())}
def pal_dist(A, B):                                   # weighted mean Oklab distance from A's colours to B's nearest
    la, lb = oklab(A['pal']), oklab(B['pal'])
    d = np.sqrt(((la[:, None, :] - lb[None]) ** 2).sum(-1)).min(1)
    return float((d * A['w']).sum())
S = {g: [stats(p) for p in ps] for g, ps in groups.items()}
def gdist(g1, g2): return float(np.mean([min(pal_dist(a, b) for b in S[g2]) for a in S[g1]]))
res = {
  'sat': {g: round(float(np.mean([s['sat'] for s in S[g]])), 3) for g in S}, 'val': {g: round(float(np.mean([s['val'] for s in S[g]])), 3) for g in S},
  'dist_new_ref': round(gdist('new', 'ref'), 4), 'dist_old_ref': round(gdist('old', 'ref'), 4), 'dist_new_old': round(gdist('new', 'old'), 4),
}
res['gate'] = res['dist_new_ref'] < res['dist_old_ref'] and res['dist_new_ref'] < res['dist_new_old']
# sheet: one row per group, 480px-wide tiles, label + palette strip
TW = 480; rows = []
for g in ['ref', 'old', 'new']:
    tiles = []
    for p, s in zip(groups[g], S[g]):
        im = Image.open(p).convert('RGB'); im = im.resize((TW, int(TW * im.height / im.width)))
        strip = Image.new('RGB', (TW, 16)); d = ImageDraw.Draw(strip); x = 0
        for c, w in sorted(zip(s['pal'], s['w']), key=lambda t: -t[1]):
            ww = int(round(w * TW)); d.rectangle([x, 0, x + ww, 16], fill=tuple(int(v) for v in c)); x += ww
        t = Image.new('RGB', (TW, im.height + 16)); t.paste(im, (0, 0)); t.paste(strip, (0, im.height)); tiles.append(t)
    row = Image.new('RGB', (TW * max(len(v) for v in groups.values()) + 90, max(t.height for t in tiles)), (12, 6, 22))
    ImageDraw.Draw(row).text((8, 8), g.upper(), fill=(255, 240, 230))
    for i, t in enumerate(tiles): row.paste(t, (90 + i * TW, 0))
    rows.append(row)
sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows) + 40), (12, 6, 22)); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height
ImageDraw.Draw(sheet).text((8, y + 8), f"palette distance (Oklab, lower = closer)  new->ref {res['dist_new_ref']}  old->ref {res['dist_old_ref']}  new->old {res['dist_new_old']}   sat {res['sat']}  val {res['val']}   gate {res['gate']}", fill=(255, 240, 230))
sheet.save(out); json.dump(res, open(out.rsplit('.', 1)[0] + '.json', 'w'), indent=1)
print(json.dumps(res))
